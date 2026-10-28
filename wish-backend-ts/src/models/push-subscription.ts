import { getDb } from "../databases/db/mongo";

export type StoredPushSubscription = {
  uid: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent: string;
  createdAt: Date;
  lastUsedAt: Date | null;
};

const subscriptions = () =>
  getDb().collection<StoredPushSubscription>("push_subscriptions");

export const savePushSubscription = async (
  uid: string,
  endpoint: string,
  keys: { p256dh: string; auth: string },
  userAgent: string
) => {
  // An endpoint belongs to one browser, so a new login on it takes it over.
  await subscriptions().updateOne(
    { endpoint },
    {
      $set: { uid, keys, userAgent },
      $setOnInsert: { createdAt: new Date(), lastUsedAt: null },
    },
    { upsert: true }
  );
};

export const getPushSubscriptions = (uid: string) =>
  subscriptions().find({ uid }).toArray();

export const deletePushSubscription = (uid: string, endpoint: string) =>
  subscriptions().deleteOne({ uid, endpoint });

export const deletePushSubscriptionByEndpoint = (endpoint: string) =>
  subscriptions().deleteOne({ endpoint });

export const deleteAllPushSubscriptions = (uid: string) =>
  subscriptions().deleteMany({ uid });

export const touchPushSubscription = (endpoint: string) =>
  subscriptions().updateOne({ endpoint }, { $set: { lastUsedAt: new Date() } });
