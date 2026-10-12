import {
  CookieOptions,
  NextFunction,
  Request,
  Response,
  Router,
} from "express";
import { v4 as uuidv4 } from "uuid";
import { hashSync, compareSync } from "bcrypt";

import { auth } from "../middleware/auth";

import {
  blockUser,
  canonicalEmailTaken,
  createSignup,
  createUser,
  getBlockedUsers,
  getDetailsForUserByUid,
  getDetailsForUserByUidHome,
  getUserByEmail,
  getUserByUid,
  getUserByResetToken,
  confirmEmailVerification,
  getUserByEmailVerifyToken,
  markUserDeleted,
  setEmailVerification,
  setChatAlertsDisabled,
  setPasswordReset,
  setUserPassword,
  unblockUser,
  UserInfoCreation,
} from "../models/user";
import { getGroupedOffers, latestOffers } from "../models/dating/xprofile";
import { validateGenderExists } from "../middleware/validate-gender";
import { validateRequest } from "../middleware/validate-request";
import { birthdateRules } from "../validators/xprofile.validators";
import {
  currencyForCountry,
  isUserType,
} from "../models/dating/service-catalog";
import config from "../endpoints.config";
import {
  buildGoogleAuthUrl,
  createPkce,
  createResetToken,
  getGoogleOAuthClient,
  hashResetToken,
  oauthPkceCookieName,
  OauthPkceCookie,
} from "../auth/google-oauth";
import { setUserSession } from "../auth/session";
import { sendEmail } from "../services/email.service";
import { getAccountVerificationEmail, getPasswordResetEmail } from "../email-templates/templates";
import { getResetCopy, getVerificationCopy, resolveEmailLang } from "../email-templates/email-i18n";
import { attachCaptcha, verifyCaptcha } from "../services/captcha.service";
import {
  clearLoginFailures,
  loginAttemptKey,
  loginCaptchaRequired,
  recordLoginFailure,
} from "../services/login-attempts.service";
import { readFingerprint, recordDevice } from "../services/device-tracking.service";
import passkeyRouter from "./passkey.routes";
import { deleteAllPasskeys } from "../models/passkey";
import { refreshPresenceBetween } from "../sockets/socketio";

const usersRouter = Router();
usersRouter.use("/passkeys", passkeyRouter);
const emailTokenTtlMs = 60 * 60 * 1000;

const loginRedirect = (lang: string, path: string) =>
  `/${resolveEmailLang(lang)}${path}`;

const ensureCaptcha = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const answer = typeof req.body?.captcha === "string" ? req.body.captcha : "";
  try {
    if (await verifyCaptcha(req, res, answer)) {
      return true;
    }
  } catch (error) {
    next(error);
    return false;
  }
  res.status(400).send({ error: "CAPTCHA_INVALID" });
  return false;
};

const isStrongPassword = (password: string) =>
  password.length >= 6 &&
  password.length <= 55 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

usersRouter.get("/captcha", (_req, res) => {
  const image = attachCaptcha(res);
  res.status(200).send({ image });
});

const sendVerificationEmail = async (
  email: string,
  name: string,
  lang: string
) => {
  const locale = resolveEmailLang(lang);
  const token = createResetToken();
  await setEmailVerification(
    email,
    hashResetToken(token),
    new Date(Date.now() + emailTokenTtlMs)
  );
  const verifyUrl = `${config.returnUrlEmail}/${locale}/manage?mode=verifyEmail&oobCode=${token}`;
  await sendEmail(
    email,
    getAccountVerificationEmail(name || "", verifyUrl, locale),
    getVerificationCopy(locale).subject
  );
};

const sendPasswordResetEmail = async (
  email: string,
  name: string,
  lang: string
) => {
  const locale = resolveEmailLang(lang);
  const token = createResetToken();
  await setPasswordReset(
    email,
    hashResetToken(token),
    new Date(Date.now() + emailTokenTtlMs)
  );
  const resetUrl = `${config.returnUrlEmail}/${locale}/manage?mode=resetPassword&oobCode=${token}`;
  await sendEmail(
    email,
    getPasswordResetEmail(name || "", resetUrl, locale),
    getResetCopy(locale).subject
  );
};

usersRouter.get("/check-auth", auth, async (req, res, next) => {
  try {
    const userObj = await getUserByUid(req.uid);
    const user = userObj?.user;

    if (!user || user.deleted) {
      req.session = null;
      return res.status(401).send({ error: "Please signup" });
    }

    res.status(200).send({
      hasUserType: !!user.userType,
      emailVerified: user.emailVerified !== false,
    });
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/google/start", (req, res, next) => {
  try {
    const lang = typeof req.query.lang === "string" ? req.query.lang : "en";
    const { state, codeVerifier, codeChallenge } = createPkce();
    const pkce: OauthPkceCookie = { state, codeVerifier, lang };
    res.cookie(oauthPkceCookieName, JSON.stringify(pkce), {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60 * 1000,
    });

    const client = getGoogleOAuthClient();
    res.redirect(buildGoogleAuthUrl(client, state, codeChallenge));
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/google/callback", async (req, res, next) => {
  const pkceRaw = req.cookies[oauthPkceCookieName];
  let lang = "en";
  try {
    if (typeof pkceRaw !== "string") {
      return res.redirect(loginRedirect(lang, "/login?googleError=1"));
    }
    const pkce = JSON.parse(pkceRaw) as OauthPkceCookie;
    lang = pkce.lang || "en";
    res.clearCookie(oauthPkceCookieName, { path: "/" });

    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    if (!code || !state || state !== pkce.state) {
      return res.redirect(loginRedirect(lang, "/login?googleError=1"));
    }

    const client = getGoogleOAuthClient();
    const { tokens } = await client.getToken({
      code,
      codeVerifier: pkce.codeVerifier,
      redirect_uri: config.googleRedirectUri,
    });
    if (!tokens.id_token) {
      return res.redirect(loginRedirect(lang, "/login?googleError=1"));
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: config.googleClientId,
    });
    const payload = ticket.getPayload();
    const email = payload?.email;
    if (!email || !payload.sub) {
      return res.redirect(loginRedirect(lang, "/login?googleError=1"));
    }

    let userObj = await getUserByEmail(email);
    if (!userObj?.user) {
      await createUser({
        name: payload.name || "",
        lastname: "",
        email,
        uid: payload.sub,
        emailVerified: payload.email_verified !== false,
        additionalUserInfo: [
          {
            providerId: "google.com",
            uid: payload.sub,
            displayName: payload.name,
            email,
            photoURL: payload.picture,
          },
        ],
        images: [],
        deleted: false,
      });
      userObj = await getUserByEmail(email);
    }

    const user = userObj?.user;
    if (!user || user.deleted) {
      return res.redirect(loginRedirect(lang, "/login?googleError=1"));
    }

    setUserSession(req, {
      uid: user.uid,
      email: user.email,
      name: user.name || payload.name,
      emailVerified: user.emailVerified !== false,
    });

    if (user.userType) {
      return res.redirect(loginRedirect(lang, "/admin/list"));
    }
    return res.redirect(loginRedirect(lang, "/admin/signup"));
  } catch (error) {
    console.error("Google OAuth callback failed", error);
    return res.redirect(loginRedirect(lang, "/login?googleError=1"));
  }
});

const clearSession = (req: Request, res: Response) => {
  res.clearCookie("session_admin", { path: "/" });
  res.clearCookie("sugrit_email", { path: "/" });
  res.clearCookie("sugrit_uid", { path: "/" });

  req.session = null;
};

usersRouter.post("/sessionLogout", async (req, res, next) => {
  try {
    clearSession(req, res);
    res.status(200).send();
  } catch (error) {
    next(error);
  }
});

usersRouter.delete("/me", auth, async (req, res, next) => {
  try {
    if (!(await markUserDeleted(req.uid))) {
      return res.status(404).send({ error: "User not found" });
    }
    await deleteAllPasskeys(req.uid);

    clearSession(req, res);
    res.status(200).send();
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/login", async (req, res, next) => {
  const attemptKey = loginAttemptKey(req);
  const user = req.body;
  try {
    if (await loginCaptchaRequired(attemptKey)) {
      const answer = typeof req.body?.captcha === "string" ? req.body.captcha : "";
      if (!(await verifyCaptcha(req, res, answer))) {
        return res
          .status(400)
          .send({ error: "CAPTCHA_INVALID", captchaRequired: true });
      }
    }

    const email: string = String(user.email || "")
      .toLowerCase()
      .trim();
    const password = user.password;

    const userObj = await getUserByEmail(email);

    if (!userObj || userObj.user.deleted) {
      return res.status(401).send({
        error: "Please authenticate",
        captchaRequired: await recordLoginFailure(attemptKey),
      });
    }

    const passwordHash = userObj.user.password;
    if (typeof passwordHash !== "string" || !passwordHash) {
      return res.status(409).send({
        error: "USE_GOOGLE",
        captchaRequired: await recordLoginFailure(attemptKey),
      });
    }

    if (!compareSync(password, passwordHash)) {
      return res.status(401).send({
        error: "Invalid data",
        captchaRequired: await recordLoginFailure(attemptKey),
      });
    }

    if (userObj.user.emailVerified === false) {
      return res.status(403).send({ error: "EMAIL_NOT_VERIFIED" });
    }

    await clearLoginFailures(attemptKey);
    setUserSession(req, {
      uid: userObj.user.uid,
      email: userObj.user.email,
      name: userObj.user.name,
      emailVerified: userObj.user.emailVerified !== false,
    });

    res.status(200).send();
  } catch (error) {
    console.log(error);
    next(error);
  }
});

usersRouter.post(
  "/signup",
  auth,
  ...birthdateRules,
  validateRequest,
  async (req, res, next) => {
  try {
    if (!isUserType(req.body.userType)) {
      return res.status(400).send({ error: "userType must be Cleaner or Client" });
    }

    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //     return res.status(400).json({ errors: errors.array() });
    // }

    const userType = req.body.userType;
    const birthday = req.body.birthday;

    // Birth date
    // const year = parseInt(req.body.year);
    // const month = parseInt(req.body.month);
    // const day = parseInt(req.body.day);
    // let monthStr = (month < 10 ? "0" : "") + month;
    // let dayStr = (day < 10 ? "0" : "") + day;
    // let isoBirthDay = `${year}-${monthStr}-${dayStr}T00:00:00.000Z`;
    let birthDateStr = birthday;
    let birthDate = new Date(birthDateStr);

    // Profile Details
    const profileName = req.body.profileName;
    const name = req.body.profileName;
    const country = req.body.country;
    const location = req.body.location;
    const locationName = req.body.locationName;

    await createSignup(req.uid, {
      profileName,
      name,
      location,
      locationName,
      country,
      currency: currencyForCountry(country),
      birthDateStr,
      birthDate,
      userType,
      claims: {
        user: userType,
      },
    });

    // if (result.insertedCount !== 1) {
    //     return res.status(400).send(null);
    // }

    return res.status(200).send({ valid: true });
  } catch (error) {
    console.log(error);
    next(error);
  }
  }
);

usersRouter.post("/device", auth, async (req, res, next) => {
  try {
    await recordDevice(req, req.uid, "session", readFingerprint(req.body?.fp));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/me", auth, async (req, res, next) => {
  try {
    //////// to remove in production
    let user = await getUserByUid(req.uid);
    if (!user || user.user.deleted) {
      return res.status(404).send({ error: "User not found" });
    }

    // getUser wraps the document as { user }, so the hash lives one level down.
    delete user.user.password;

    const options: CookieOptions = {
      httpOnly: false,
      secure: config.cookieSecure,
      sameSite: "lax",
      path: "/",
    };
    res.cookie("sugrit_uid", req.uid, options);
    res.cookie("sugrit_email", req.email, options);
    res.status(200).send(user);
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/create-user", async (req, res, next) => {
  if (!(await ensureCaptcha(req, res, next))) {
    return;
  }
  const user = req.body;

  try {
    const name: string = user.name;
    const lastname: string = user.lastname;
    const email: string = String(user.email || "")
      .toLowerCase()
      .trim();
    const password: string = user.password;
    const additionalUserInfo = user.additionalUserInfo;
    const uid: string = uuidv4();
    const phoneNumber = user.phoneNumber;
    const images = user.images;
    const lang = typeof user.lang === "string" ? user.lang : "en";

    if (!email || !password) {
      return res.status(400).send({ error: "Invalid data" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).send({ error: "WEAK_PASSWORD" });
    }

    const existing = await getUserByEmail(email);
    if (existing?.user) {
      const existingPassword = existing.user.password;
      if (typeof existingPassword !== "string" || !existingPassword) {
        return res.status(409).send({ error: "USE_GOOGLE" });
      }
      return res.status(409).send({ error: "EMAIL_EXISTS" });
    }
    if (await canonicalEmailTaken(email)) {
      return res.status(409).send({ error: "EMAIL_EXISTS" });
    }

    const passwordHashed = hashSync(password, 12);

    const userObj: UserInfoCreation = {
      name,
      lastname,
      email,
      password: passwordHashed,
      additionalUserInfo,
      uid,
      emailVerified: false,
      phoneNumber,
      images,
      deleted: false,
    };

    await createUser(userObj);

    try {
      await recordDevice(req, uid, "signup", readFingerprint(user.fp));
    } catch (error) {
      console.error("Failed to record signup device", error);
    }

    try {
      await sendVerificationEmail(email, name || "", lang);
    } catch (error) {
      console.error("Failed to send verification email", error);
    }

    res.status(200).send();
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/verify-email", async (req, res, next) => {
  try {
    const token = String(req.body.token || "");
    if (!token) {
      return res.status(400).send({ error: "Invalid or expired verification code" });
    }

    const user = await getUserByEmailVerifyToken(hashResetToken(token));
    if (!user?.email) {
      return res.status(400).send({ error: "Invalid or expired verification code" });
    }

    if (user.emailVerified) {
      return res.status(200).send();
    }

    if (
      !user.emailVerifyExpires ||
      new Date(user.emailVerifyExpires).getTime() <= Date.now()
    ) {
      return res.status(400).send({ error: "Invalid or expired verification code" });
    }

    await confirmEmailVerification(user.email);
    res.status(200).send();
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/resend-verification-email", async (req, res, next) => {
  try {
    const email = String(req.body.email || "")
      .toLowerCase()
      .trim();
    const lang = typeof req.body.lang === "string" ? req.body.lang : "en";
    const userObj = email ? await getUserByEmail(email) : null;

    if (userObj?.user && userObj.user.emailVerified === false) {
      try {
        await sendVerificationEmail(email, userObj.user.name || "", lang);
      } catch (error) {
        console.error("Failed to send verification email", error);
      }
    }

    res.status(200).send();
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/request-password-reset", async (req, res, next) => {
  if (!(await ensureCaptcha(req, res, next))) {
    return;
  }
  try {
    const email = String(req.body.email || "")
      .toLowerCase()
      .trim();
    const lang = typeof req.body.lang === "string" ? req.body.lang : "en";
    const userObj = email ? await getUserByEmail(email) : null;

    if (userObj?.user && !userObj.user.deleted) {
      try {
        await sendPasswordResetEmail(email, userObj.user.name || "", lang);
      } catch (error) {
        console.error("Failed to send password reset email", error);
      }
    }

    res.status(200).send();
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/reset-password", async (req, res, next) => {
  if (!(await ensureCaptcha(req, res, next))) {
    return;
  }
  try {
    const token = String(req.body.token || "");
    const password = String(req.body.password || "");
    if (!token) {
      return res.status(400).send({ error: "Invalid reset request" });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).send({ error: "WEAK_PASSWORD" });
    }

    const user = await getUserByResetToken(hashResetToken(token));
    if (!user?.email) {
      return res.status(400).send({ error: "Invalid or expired reset code" });
    }

    await setUserPassword(user.email, hashSync(password, 12));
    res.status(200).send();
  } catch (error) {
    next(error);
  }
});

usersRouter.post(
  "/block-user",
  auth,
  validateGenderExists,
  async (req, res, next) => {
    const user = req.body;
    const userToBlock = user.userToBlock;

    // const userRecord: UserRecord = await admin.auth().getUser(userToBlock);
    // if (!userRecord.email) {
    //   return res.status(400).send({
    //     error: "User has no email defined",
    //   });
    // }

    let userObj = await getUserByUid(userToBlock);

    try {
      await blockUser(req.uid, userObj.user.uid);
      refreshPresenceBetween(req.uid, userObj.user.uid).catch((err) =>
        console.error("Failed to refresh presence after block", err),
      );
      res.status(200).send();
    } catch (error) {
      next(error);
    }
  }
);

usersRouter.get(
  "/get-blocked-users",
  auth,
  validateGenderExists,
  async (req, res, next) => {
    try {
      const blockedUsers = await getBlockedUsers(req.uid);
      res.status(200).send(blockedUsers);
    } catch (error) {
      next(error);
    }
  }
);

usersRouter.post(
  "/unblock-user",
  auth,
  validateGenderExists,
  async (req, res, next) => {
    try {
      const user = req.body;
      const userToBlock = user.user;
      // const userRecord: UserRecord = await admin.auth().getUser(userToBlock);
      // if (!userRecord.email) {
      //   return res.status(400).send({
      //     error: "User has no email defined",
      //   });
      // }

      let userObj = await getUserByUid(userToBlock);

      await unblockUser(req.uid, userObj.user.uid);
      refreshPresenceBetween(req.uid, userObj.user.uid).catch((err) =>
        console.error("Failed to refresh presence after unblock", err),
      );
      res.status(200).send();
    } catch (error) {
      next(error);
    }
  }
);

usersRouter.post("/chat-alerts", auth, async (req, res, next) => {
  const disabled = req.body?.disabled;
  if (typeof disabled !== "boolean") {
    return res.status(400).send({ error: "Invalid data" });
  }

  try {
    if (!(await setChatAlertsDisabled(req.uid, disabled))) {
      return res.status(404).send({ error: "User not found" });
    }
    res.status(200).send({ chatAlertsDisabled: disabled });
  } catch (error) {
    next(error);
  }
});

// Get data information about other users
usersRouter.get("/userDetails", auth, async (req, res, next) => {
  let userId = req.query.userId as "string";

  // const userToRecord: UserRecord = await admin.auth().getUser(userId);
  // if (!userToRecord.email) {
  //   return res.status(400).send({
  //     error: "User has no email defined",
  //   });
  // }

  try {
    let user = await getDetailsForUserByUid(userId);

    res.status(200).send(user);
  } catch (error) {
    next(error);
  }
});

// Get data information about other users
usersRouter.get("/userDetailsHome", async (req, res, next) => {
  let userId = req.query.userId as "string";

  try {
    let user = await getDetailsForUserByUidHome(userId);

    res.status(200).send(user);
  } catch (error) {
    next(error);
  }
});

usersRouter.get(
  "/latestOffers",
  auth,
  validateGenderExists,
  async (req, res, next) => {
    let userType = req.query.userType as "string";

    try {
      let user = await latestOffers(userType as string);

      res.status(200).send(user);
    } catch (error) {
      next(error);
    }
  }
);

usersRouter.get(
  "/offerSearch",
  auth,
  validateGenderExists,
  async (req, res, next) => {
    let userType = req.query.userType as "string";
    let offer = req.query.offer as "string";

    try {
      let userOffers = await getGroupedOffers(userType, offer);

      res.status(200).send(userOffers);
    } catch (error) {
      next(error);
    }
  }
);

usersRouter.get("/test", async (req, res) => {
  // setTimeout(() => {
  res.send({ test: "true" });
  // }, 1000);
});

export default usersRouter;
