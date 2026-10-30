import config from "../endpoints.config";
import { createResetToken, hashResetToken } from "../auth/google-oauth";
import { setEmailVerification } from "../models/user";
import { sendEmail } from "./email.service";
import {
  getAccountVerificationEmail,
  getWelcomeEmail,
} from "../email-templates/templates";
import {
  getVerificationCopy,
  getWelcomeCopy,
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

export const sendWelcomeEmail = (email: string, name: string, lang: string) => {
  const locale = resolveEmailLang(lang);
  const url = `${config.returnUrlEmail}/${locale}/admin/preferences`;
  const copy = getWelcomeCopy(locale);
  return sendEmail(
    email,
    getWelcomeEmail(name || "", url, locale),
    copy.subject,
  ).catch((error) => {
    console.error("Welcome email failed", error);
  });
};
