import config from "../endpoints.config";
import { getDb } from "../databases/db/mongo";
import { ChatMessageDTO } from "../interfaces/main-interfaces";
import {
  getChatNoticeCopy,
  getLikeNoticeCopy,
  NoticeCopy,
  resolveEmailLang,
} from "../email-templates/email-i18n";
import { getCustomMessageEmail } from "../email-templates/templates";
import { sendEmail } from "./email.service";
import { acquireThrottle } from "./push.service";

const CHAT_EMAIL_THROTTLE_SECONDS = 6 * 60 * 60;

type MailUser = {
  email?: string;
  name?: string;
  lang?: string;
  deleted?: boolean;
};

const loadUser = (uid: string) =>
  getDb()
    .collection<MailUser>("users")
    .findOne(
      { uid },
      { projection: { _id: 0, email: 1, name: 1, lang: 1, deleted: 1 } },
    );

const displayName = (name: string | undefined, fallback: string) => {
  const trimmed = name?.trim();
  return trimmed || fallback;
};

const deliver = (
  to: string,
  name: string | undefined,
  lang: string | undefined,
  copy: NoticeCopy,
  body: string,
  urlPath: string,
) => {
  const locale = resolveEmailLang(lang);
  const url = `${config.returnUrlEmail}/${locale}${urlPath}`;
  return sendEmail(
    to,
    getCustomMessageEmail(name || "", locale, copy.heading, body, copy.cta, url),
    copy.subject,
  );
};

export const notifyChatByEmail = (message: ChatMessageDTO) => {
  void (async () => {
    const allowed = await acquireThrottle(
      `email:chat:${message.sender}:${message.receiver}`,
      CHAT_EMAIL_THROTTLE_SECONDS,
    );
    if (!allowed) {
      return;
    }

    const [sender, receiver] = await Promise.all([
      loadUser(message.sender),
      loadUser(message.receiver),
    ]);
    if (!sender || !receiver || receiver.deleted || !receiver.email) {
      return;
    }

    const copy = getChatNoticeCopy(receiver.lang);
    await deliver(
      receiver.email,
      receiver.name,
      receiver.lang,
      copy,
      copy.body.replace("--NAME--", displayName(sender.name, copy.someone)),
      `/admin/chat?uid=${encodeURIComponent(message.sender)}`,
    );
  })().catch((error) => console.error("Chat email failed", error));
};

export const notifyLikeByEmail = (likerUid: string, likedUid: string) => {
  void (async () => {
    const [liker, liked] = await Promise.all([
      loadUser(likerUid),
      loadUser(likedUid),
    ]);
    if (!liker || !liked || liked.deleted || !liked.email) {
      return;
    }

    const copy = getLikeNoticeCopy(liked.lang);
    await deliver(
      liked.email,
      liked.name,
      liked.lang,
      copy,
      copy.body.replace("--NAME--", displayName(liker.name, copy.someone)),
      "/admin/activity",
    );
  })().catch((error) => console.error("Like email failed", error));
};
