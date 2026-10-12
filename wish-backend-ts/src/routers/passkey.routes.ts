import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";

import { auth } from "../middleware/auth";
import config from "../endpoints.config";
import { setUserSession } from "../auth/session";
import { getUserByUid } from "../models/user";
import {
  consumeChallenge,
  countPasskeys,
  deletePasskey,
  getPasskey,
  insertPasskey,
  listPasskeys,
  saveChallenge,
  updatePasskeyUse,
} from "../models/passkey";

const passkeyRouter = Router();
const maxPasskeys = 10;

const bytesToBase64Url = (bytes: Uint8Array) =>
  Buffer.from(bytes).toString("base64url");

const base64UrlToBytes = (value: string) =>
  new Uint8Array(Buffer.from(value, "base64url"));

const loadAccount = async (uid: string) => {
  const userObj = await getUserByUid(uid);
  return userObj?.user ?? null;
};

passkeyRouter.post("/register/options", auth, async (req, res, next) => {
  try {
    const user = await loadAccount(req.uid);
    if (!user || user.deleted) {
      return res.status(401).send({ error: "Please authenticate" });
    }
    if (user.emailVerified === false) {
      return res.status(403).send({ error: "EMAIL_NOT_VERIFIED" });
    }
    if ((await countPasskeys(req.uid)) >= maxPasskeys) {
      return res.status(409).send({ error: "PASSKEY_LIMIT" });
    }

    const existing = await listPasskeys(req.uid);
    const options = await generateRegistrationOptions({
      rpName: config.webauthnRpName,
      rpID: config.webauthnRpId,
      userName: user.email,
      userID: new TextEncoder().encode(user.uid),
      userDisplayName: user.name || user.email,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "required",
      },
      excludeCredentials: existing.map((passkey) => ({
        id: passkey.credentialId,
      })),
    });

    const challengeId = uuidv4();
    await saveChallenge(challengeId, options.challenge, "registration", req.uid);
    res.status(200).send({ challengeId, options });
  } catch (error) {
    next(error);
  }
});

passkeyRouter.post("/register/verify", auth, async (req, res, next) => {
  try {
    const challengeId =
      typeof req.body?.challengeId === "string" ? req.body.challengeId : "";
    const response = req.body?.response as RegistrationResponseJSON | undefined;
    if (!challengeId || !response?.id) {
      return res.status(400).send({ error: "PASSKEY_INVALID" });
    }

    const challenge = await consumeChallenge(
      challengeId,
      "registration",
      req.uid
    );
    if (!challenge?.challenge) {
      return res.status(400).send({ error: "CHALLENGE_INVALID" });
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: String(challenge.challenge),
        expectedOrigin: config.webauthnOrigins,
        expectedRPID: config.webauthnRpId,
        requireUserVerification: true,
      });
    } catch {
      return res.status(400).send({ error: "PASSKEY_INVALID" });
    }

    if (!verification.verified) {
      return res.status(400).send({ error: "PASSKEY_INVALID" });
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    try {
      await insertPasskey({
        credentialId: credential.id,
        uid: req.uid,
        publicKey: bytesToBase64Url(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports ?? response.response.transports ?? [],
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        createdAt: new Date(),
        lastUsedAt: null,
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error &&
        "code" in error &&
        (error as { code?: number }).code === 11000
      ) {
        return res.status(409).send({ error: "PASSKEY_EXISTS" });
      }
      throw error;
    }

    res.status(200).send();
  } catch (error) {
    next(error);
  }
});

passkeyRouter.post("/login/options", async (req, res, next) => {
  try {
    const options = await generateAuthenticationOptions({
      rpID: config.webauthnRpId,
      userVerification: "required",
    });
    const challengeId = uuidv4();
    await saveChallenge(challengeId, options.challenge, "authentication");
    res.status(200).send({ challengeId, options });
  } catch (error) {
    next(error);
  }
});

passkeyRouter.post("/login/verify", async (req, res, next) => {
  try {
    const challengeId =
      typeof req.body?.challengeId === "string" ? req.body.challengeId : "";
    const response = req.body?.response as AuthenticationResponseJSON | undefined;
    if (!challengeId || !response?.id) {
      return res.status(400).send({ error: "PASSKEY_INVALID" });
    }

    const challenge = await consumeChallenge(challengeId, "authentication");
    if (!challenge?.challenge) {
      return res.status(400).send({ error: "CHALLENGE_INVALID" });
    }

    const passkey = await getPasskey(response.id);
    if (!passkey) {
      return res.status(401).send({ error: "PASSKEY_NOT_FOUND" });
    }

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: String(challenge.challenge),
        expectedOrigin: config.webauthnOrigins,
        expectedRPID: config.webauthnRpId,
        requireUserVerification: true,
        credential: {
          id: passkey.credentialId,
          publicKey: base64UrlToBytes(passkey.publicKey),
          counter: passkey.counter,
          transports: passkey.transports,
        },
      });
    } catch {
      return res.status(400).send({ error: "PASSKEY_INVALID" });
    }

    if (!verification.verified) {
      return res.status(400).send({ error: "PASSKEY_INVALID" });
    }

    const info = verification.authenticationInfo;
    await updatePasskeyUse(
      passkey.credentialId,
      info.newCounter,
      info.credentialDeviceType,
      info.credentialBackedUp
    );

    const user = await loadAccount(passkey.uid);
    if (!user || user.deleted) {
      return res.status(401).send({ error: "Please authenticate" });
    }
    if (user.emailVerified === false) {
      return res.status(403).send({ error: "EMAIL_NOT_VERIFIED" });
    }

    setUserSession(req, {
      uid: user.uid,
      email: user.email,
      name: user.name,
      emailVerified: true,
    });
    res.status(200).send();
  } catch (error) {
    next(error);
  }
});

passkeyRouter.get("/", auth, async (req, res, next) => {
  try {
    const items = await listPasskeys(req.uid);
    res.status(200).send(items);
  } catch (error) {
    next(error);
  }
});

passkeyRouter.delete("/:credentialId", auth, async (req, res, next) => {
  try {
    const removed = await deletePasskey(req.uid, req.params.credentialId);
    if (!removed) {
      return res.status(404).send({ error: "PASSKEY_NOT_FOUND" });
    }
    res.status(200).send();
  } catch (error) {
    next(error);
  }
});

export default passkeyRouter;
