import { getCustomMessageEmail } from "../email-templates/templates";
import { MailableUser } from "../models/user";
import { sendEmail } from "./email.service";

export type CustomMail = {
  subject: string;
  message: string;
  cta?: string;
  url?: string;
};

const sendOne = async (recipient: MailableUser, mail: CustomMail) => {
  await sendEmail(
    recipient.email,
    getCustomMessageEmail(
      recipient.name || "",
      recipient.lang,
      mail.subject,
      mail.message,
      mail.cta,
      mail.url,
    ),
    mail.subject,
  );
};

const eachWithLimit = async <T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
) => {
  let index = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (index < items.length) {
        const current = items[index];
        index += 1;
        await worker(current);
      }
    },
  );
  await Promise.all(runners);
};

export const sendCustomMessages = async (
  recipients: MailableUser[],
  mail: CustomMail,
) => {
  let sent = 0;
  let failed = 0;

  await eachWithLimit(recipients, 5, async (recipient) => {
    try {
      await sendOne(recipient, mail);
      sent += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`custom email failed for ${recipient.email}: ${message}`);
    }
  });

  return { sent, failed, total: recipients.length };
};
