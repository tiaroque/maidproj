import webpush, { WebPushError } from "web-push";
import config from "../endpoints.config";
import { getDb } from "../databases/db/mongo";
import { getRedisConnection } from "../databases/redis/redis";
import {
  deletePushSubscriptionByEndpoint,
  getPushSubscriptions,
  touchPushSubscription,
} from "../models/push-subscription";
import { getPushPrefs, PushKind } from "../models/user";
import { ChatMessageDTO } from "../interfaces/main-interfaces";
import { getPushCopy, withName } from "./push-i18n";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
  icon: string;
};

const ICON = "/assets/images/icons/icon-192.png";
const PREVIEW_LENGTH = 120;
const VISIT_THROTTLE_SECONDS = 24 * 60 * 60;
// Push services drop messages they cannot deliver within this time.
const TTL_SECONDS = 24 * 60 * 60;

export const isPushConfigured = () =>
  !!config.vapidPublicKey && !!config.vapidPrivateKey;

if (isPushConfigured()) {
  webpush.setVapidDetails(
    config.vapidSubject,
    config.vapidPublicKey,
    config.vapidPrivateKey
  );
} else {
  console.warn("VAPID keys are not set, push notifications are disabled");
}

const getPushUser = (uid: string) =>
  getDb()
    .collection("users")
    .findOne(
      { uid },
      { projection: { _id: 0, name: 1, lang: 1, deleted: 1 } }
    );

const sendPushToUser = async (
  uid: string,
  kind: PushKind,
  payload: PushPayload
) => {
  if (!isPushConfigured()) {
    return;
  }

  const [prefs, subscriptions] = await Promise.all([
    getPushPrefs(uid),
    getPushSubscriptions(uid),
  ]);
  if (!prefs[kind] || subscriptions.length === 0) {
    return;
  }

  const body = JSON.stringify(payload);
  await Promise.all(
    subscriptions.map(async ({ endpoint, keys }) => {
      try {
        await webpush.sendNotification({ endpoint, keys }, body, {
          TTL: TTL_SECONDS,
        });
        await touchPushSubscription(endpoint);
      } catch (error) {
        // 404 and 410 mean the browser dropped the subscription for good.
        if (
          error instanceof WebPushError &&
          (error.statusCode === 404 || error.statusCode === 410)
        ) {
          await deletePushSubscriptionByEndpoint(endpoint);
          return;
        }
        console.error("Push delivery failed", error);
      }
    })
  );
};

// Callers must not wait on push delivery, and a failure must never surface.
const fireAndForget = (task: () => Promise<void>) => {
  task().catch((error) => console.error("Push notification failed", error));
};

const memoryThrottle = new Map<string, number>();

const acquireThrottle = async (key: string, seconds: number) => {
  const redis = getRedisConnection();
  if (redis) {
    return (await redis.set(key, "1", "EX", seconds, "NX")) === "OK";
  }

  const now = Date.now();
  const until = memoryThrottle.get(key);
  if (until && until > now) {
    return false;
  }
  memoryThrottle.set(key, now + seconds * 1000);
  return true;
};

export const notifyChatMessage = (message: ChatMessageDTO) =>
  fireAndForget(async () => {
    const [sender, receiver] = await Promise.all([
      getPushUser(message.sender),
      getPushUser(message.receiver),
    ]);
    if (!sender || !receiver || receiver.deleted) {
      return;
    }

    const { lang, copy } = getPushCopy(receiver.lang);
    const text =
      message.type === "media" ? copy.chatMedia : (message.message ?? "");
    await sendPushToUser(message.receiver, "chat", {
      title: withName(copy.chatTitle, sender.name ?? ""),
      body:
        text.length > PREVIEW_LENGTH
          ? `${text.slice(0, PREVIEW_LENGTH)}…`
          : text,
      url: `/${lang}/admin/chat?uid=${encodeURIComponent(message.sender)}`,
      tag: `chat:${message.conversationId}`,
      icon: ICON,
    });
  });

export const notifyProfileLiked = (likerUid: string, likedUid: string) =>
  fireAndForget(async () => {
    const [liker, liked] = await Promise.all([
      getPushUser(likerUid),
      getPushUser(likedUid),
    ]);
    if (!liker || !liked || liked.deleted) {
      return;
    }

    const { lang, copy } = getPushCopy(liked.lang);
    await sendPushToUser(likedUid, "likes", {
      title: copy.likeTitle,
      body: withName(copy.likeBody, liker.name ?? ""),
      url: `/${lang}/admin/activity`,
      tag: `like:${likerUid}`,
      icon: ICON,
    });
  });

export const notifyProfileVisited = (visitorUid: string, visitedUid: string) =>
  fireAndForget(async () => {
    const allowed = await acquireThrottle(
      `push:visit:${visitorUid}:${visitedUid}`,
      VISIT_THROTTLE_SECONDS
    );
    if (!allowed) {
      return;
    }

    const [visitor, visited] = await Promise.all([
      getPushUser(visitorUid),
      getPushUser(visitedUid),
    ]);
    if (!visitor || !visited || visited.deleted) {
      return;
    }

    const { lang, copy } = getPushCopy(visited.lang);
    await sendPushToUser(visitedUid, "visits", {
      title: copy.visitTitle,
      body: withName(copy.visitBody, visitor.name ?? ""),
      url: `/${lang}/admin/activity`,
      tag: `visit:${visitorUid}`,
      icon: ICON,
    });
  });
