import { Router } from "express";
import { matchedData } from "express-validator";
import { auth } from "../middleware/auth";
import { requireModerator } from "../middleware/require-moderator";
import { validateRequest } from "../middleware/validate-request";
import {
  getUserByEmail,
  listMailableUsers,
  countMailableUsers,
  MailableUser,
} from "../models/user";
import { sendCustomMessages } from "../services/admin-mail.service";
import {
  previewMailRules,
  sendMailRules,
} from "../validators/admin-mail.validators";

const adminMailRouter = Router();
adminMailRouter.use(auth, requireModerator);

const oneRecipient = async (email: string): Promise<MailableUser[]> => {
  const user = (await getUserByEmail(email))?.user;
  if (!user || user.deleted || user.isFake || !user.email) {
    return [];
  }
  return [
    {
      email: String(user.email).trim().toLowerCase(),
      name: user.name,
      lang: user.lang,
    },
  ];
};

adminMailRouter.get(
  "/preview",
  ...previewMailRules,
  validateRequest,
  async (req, res, next) => {
    try {
      const { audience, email } = matchedData(req, { locations: ["query"] });
      if (audience === "one") {
        const [recipient] = await oneRecipient(email);
        return res.status(200).send({
          count: recipient ? 1 : 0,
          name: recipient?.name || "",
          email: recipient?.email || email,
        });
      }
      res.status(200).send({ count: await countMailableUsers() });
    } catch (error) {
      next(error);
    }
  },
);

adminMailRouter.post(
  "/",
  ...sendMailRules,
  validateRequest,
  async (req, res, next) => {
    try {
      const { audience, email, subject, message, cta, url } = matchedData(req, {
        locations: ["body"],
      });
      const recipients =
        audience === "one"
          ? await oneRecipient(email)
          : await listMailableUsers();

      if (audience === "one" && recipients.length === 0) {
        return res.status(404).send({ error: "USER_NOT_FOUND" });
      }
      if (recipients.length === 0) {
        return res.status(409).send({ error: "NO_RECIPIENTS" });
      }

      const result = await sendCustomMessages(recipients, {
        subject,
        message,
        cta: cta || undefined,
        url: url || undefined,
      });
      res.status(result.sent === 0 ? 502 : 200).send(result);
    } catch (error) {
      next(error);
    }
  },
);

export default adminMailRouter;
