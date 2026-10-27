/**
 * Emails people who started an account but never finished it.
 *
 *   npm run remind:registration            dry run, lists who would be emailed
 *   npm run remind:registration -- --yes   sends the emails
 *
 * In production it runs as a Coolify scheduled task inside the app container:
 *   node dist/scripts/send-registration-reminders.js --yes
 *
 * Unverified email/password accounts get a fresh verification link, since the
 * original one expires after an hour. Verified accounts without a userType
 * never completed /signup and get a link back to log in, which forwards them
 * to the signup page.
 */
import config from "../endpoints.config";
import { close, connectMongo, getDb } from "../databases/db/mongo";
import { sendEmail } from "../services/email.service";
import { sendVerificationEmail } from "../services/verification-email.service";
import { getSignupReminderEmail } from "../email-templates/templates";
import {
  getSignupReminderCopy,
  resolveEmailLang,
} from "../email-templates/email-i18n";

const DAY_MS = 24 * 60 * 60 * 1000;
const FIRST_REMINDER_AFTER_MS = DAY_MS;
const REMINDER_INTERVAL_MS = 3 * DAY_MS;
const MAX_REMINDERS = 2;
const GIVE_UP_AFTER_MS = 30 * DAY_MS;

type PendingUser = {
  uid: string;
  email: string;
  name?: string;
  lang?: string;
  emailVerified?: boolean;
};

const describeError = (error: unknown) => {
  const { status, details, message } = (error ?? {}) as {
    status?: number;
    details?: string;
    message?: string;
  };
  return (
    [status && `status=${status}`, details || message]
      .filter(Boolean)
      .join(" ") || String(error)
  );
};

const sendReminder = async (user: PendingUser) => {
  const lang = resolveEmailLang(user.lang);
  if (user.emailVerified === false) {
    await sendVerificationEmail(user.email, user.name || "", lang);
    return;
  }
  const url = `${config.returnUrlEmail}/${lang}/login`;
  await sendEmail(
    user.email,
    getSignupReminderEmail(user.name || "", url, lang),
    getSignupReminderCopy(lang).subject,
  );
};

const main = async () => {
  const apply = process.argv.includes("--yes");
  const now = Date.now();

  await connectMongo();
  try {
    const users = getDb().collection("users");
    const pending = await users
      .find({
        deleted: { $ne: true },
        isFake: { $ne: true },
        userType: { $exists: false },
        email: { $exists: true, $ne: "" },
        creationDate: {
          $lte: new Date(now - FIRST_REMINDER_AFTER_MS),
          $gte: new Date(now - GIVE_UP_AFTER_MS),
        },
        // $not also matches documents where the field is missing.
        reminderCount: { $not: { $gte: MAX_REMINDERS } },
        lastReminderAt: { $not: { $gt: new Date(now - REMINDER_INTERVAL_MS) } },
      })
      .project<PendingUser>({
        _id: 0,
        uid: 1,
        email: 1,
        name: 1,
        lang: 1,
        emailVerified: 1,
      })
      .toArray();

    let sent = 0;
    for (const user of pending) {
      const kind = user.emailVerified === false ? "verify" : "signup";
      console.log(
        `${apply ? "Sending" : "Would send"} ${kind} reminder to ${user.email} (${user.uid})`,
      );
      if (!apply) {
        continue;
      }

      try {
        await sendReminder(user);
        await users.updateOne(
          { uid: user.uid },
          { $set: { lastReminderAt: new Date() }, $inc: { reminderCount: 1 } },
        );
        sent++;
      } catch (error) {
        console.error(
          `[registration-reminder-failed] ${user.email}: ${describeError(error)}`,
        );
        process.exitCode = 1;
      }
    }

    console.log(
      apply
        ? `Sent ${sent} of ${pending.length} reminder(s).`
        : `${pending.length} user(s) matched. Dry run only, re-run with --yes to send.`,
    );
  } finally {
    await close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
