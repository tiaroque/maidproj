import config from "../endpoints.config";
import { createResetToken, hashResetToken } from "../auth/google-oauth";
import { setEmailVerification } from "../models/user";
import { sendEmail } from "./email.service";
import { getAccountVerificationEmail } from "../email-templates/templates";
import {
  getVerificationCopy,
  resolveEmailLang,
} from "../email-templates/email-i18n";

export const emailTokenTtlMs = 60 * 60 * 1000;

export const sendVerificationEmail = async (
  email: string,
  name: string,
  lang: string,
) => {
  const locale = resolveEmailLang(lang);
  const token = createResetToken();
  await setEmailVerification(
    email,
    hashResetToken(token),
    new Date(Date.now() + emailTokenTtlMs),
  );
  const verifyUrl = `${config.returnUrlEmail}/${locale}/manage?mode=verifyEmail&oobCode=${token}`;
  await sendEmail(
    email,
    getAccountVerificationEmail(name || "", verifyUrl, locale),
    getVerificationCopy(locale).subject,
  );
};
