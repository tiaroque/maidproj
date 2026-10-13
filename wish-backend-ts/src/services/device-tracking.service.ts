import { createHmac } from "crypto";
import { NextFunction, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../databases/db/mongo";
import config from "../endpoints.config";

export const deviceCookieName = "clara_did";
const deviceCookieMaxAgeMs = 1000 * 60 * 60 * 24 * 365 * 2;
const fingerprintPattern = /^[a-f0-9]{64}$/;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type DeviceEvent = "signup" | "session";

export type UserDevice = {
  uid: string;
  deviceId: string;
  fingerprints: string[];
  ipHashes: string[];
  userAgent?: string;
  events: DeviceEvent[];
  firstSeenAt: Date;
  lastSeenAt: Date;
};

export type LinkSignal = "device" | "fingerprint" | "ip";
export type ClusterSignal = Exclude<LinkSignal, "ip">;

type ClusterReview = {
  signal: ClusterSignal;
  key: string;
  uids: string[];
  reviewedBy: string;
  reviewedAt: Date;
};

export type ClusterAccount = {
  uid: string;
  email: string;
  profileName?: string;
  userType?: string;
  verified?: boolean;
  emailVerified?: boolean;
  deleted?: boolean;
  removedByModerator?: boolean;
  deletedAt?: Date;
  creationDate?: Date;
};

export const clusterAccountProjection = {
  _id: 0,
  uid: 1,
  email: 1,
  profileName: 1,
  userType: 1,
  verified: 1,
  emailVerified: 1,
  deleted: 1,
  removedByModerator: 1,
  deletedAt: 1,
  creationDate: 1,
};

/** An active account created after a moderator removed another one in the group. */
const hasReturningAccount = (accounts: ClusterAccount[]) => {
  const removals = accounts
    .filter((account) => account.removedByModerator && account.deletedAt)
    .map((account) => account.deletedAt!.getTime());
  return accounts.some(
    (account) =>
      !account.deleted &&
      !!account.creationDate &&
      removals.some((removedAt) => account.creationDate!.getTime() > removedAt),
  );
};

const devices = () => getDb().collection<UserDevice>("user_devices");
const reviewsCollection = () =>
  getDb().collection<ClusterReview>("multi_account_reviews");

/** Gives every browser a long-lived random id, the strongest signal we have. */
export const ensureDeviceId = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const existing = req.cookies?.[deviceCookieName];
  if (typeof existing === "string" && uuidPattern.test(existing)) {
    req.deviceId = existing;
    return next();
  }
  req.deviceId = uuidv4();
  res.cookie(deviceCookieName, req.deviceId, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax",
    path: "/",
    maxAge: deviceCookieMaxAgeMs,
  });
  next();
};

// IPs are only compared for equality, so a keyed hash avoids storing them raw.
const hashIp = (ip: string) =>
  createHmac("sha256", config.sessionSecret).update(ip).digest("hex");

export const readFingerprint = (value: unknown) =>
  typeof value === "string" && fingerprintPattern.test(value) ? value : null;

export const recordDevice = async (
  req: Request,
  uid: string,
  event: DeviceEvent,
  fingerprint: string | null,
) => {
  if (!req.deviceId) {
    return;
  }
  const now = new Date();
  const addToSet: Record<string, unknown> = { events: event };
  if (fingerprint) {
    addToSet.fingerprints = fingerprint;
  }
  if (req.ip) {
    addToSet.ipHashes = hashIp(req.ip);
  }
  await devices().updateOne(
    { uid, deviceId: req.deviceId },
    {
      $set: {
        lastSeenAt: now,
        userAgent: req.get("user-agent")?.slice(0, 512),
      },
      $setOnInsert: { firstSeenAt: now },
      $addToSet: addToSet,
    },
    { upsert: true },
  );
};

/**
 * Collapses the address variants a mailbox accepts, so `J.Doe+2@gmail.com`
 * and `jdoe@googlemail.com` resolve to the same account.
 */
export const canonicalEmail = (email: string) => {
  const [rawLocal, rawDomain] = email.toLowerCase().trim().split("@");
  if (!rawLocal || !rawDomain) {
    return email.toLowerCase().trim();
  }
  let local = rawLocal.split("+")[0];
  let domain = rawDomain;
  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.replace(/\./g, "");
    domain = "gmail.com";
  }
  return `${local}@${domain}`;
};

/** Other accounts that share a device, fingerprint or IP with `uid`. */
export const findLinkedAccounts = async (uid: string) => {
  const own = await devices().find({ uid }).toArray();
  if (own.length === 0) {
    return [];
  }

  const deviceIds = own.map((device) => device.deviceId);
  const fingerprints = [
    ...new Set(own.flatMap((device) => device.fingerprints ?? [])),
  ];
  const ipHashes = [...new Set(own.flatMap((device) => device.ipHashes ?? []))];

  const matches = await devices()
    .find({
      uid: { $ne: uid },
      $or: [
        { deviceId: { $in: deviceIds } },
        { fingerprints: { $in: fingerprints } },
        { ipHashes: { $in: ipHashes } },
      ],
    })
    .toArray();

  const linked = new Map<
    string,
    { signals: Set<LinkSignal>; lastSeenAt: Date }
  >();
  matches.forEach((match) => {
    const entry = linked.get(match.uid) ?? {
      signals: new Set<LinkSignal>(),
      lastSeenAt: match.lastSeenAt,
    };
    if (deviceIds.includes(match.deviceId)) {
      entry.signals.add("device");
    }
    if (match.fingerprints?.some((fp) => fingerprints.includes(fp))) {
      entry.signals.add("fingerprint");
    }
    if (match.ipHashes?.some((ip) => ipHashes.includes(ip))) {
      entry.signals.add("ip");
    }
    if (match.lastSeenAt > entry.lastSeenAt) {
      entry.lastSeenAt = match.lastSeenAt;
    }
    linked.set(match.uid, entry);
  });

  const users = await getDb()
    .collection("users")
    .find({ uid: { $in: [...linked.keys()] } })
    .project<{
      uid: string;
      email: string;
      name?: string;
      deleted?: boolean;
      creationDate?: Date;
    }>({ _id: 0, uid: 1, email: 1, name: 1, deleted: 1, creationDate: 1 })
    .toArray();

  return users.map((user) => {
    const entry = linked.get(user.uid)!;
    return {
      ...user,
      signals: [...entry.signals],
      lastSeenAt: entry.lastSeenAt,
    };
  });
};

/**
 * Groups of accounts seen on the same browser (`device`) or with the same
 * browser fingerprint. Fingerprints collide across identical phones, so
 * treat `fingerprint` clusters as leads, not proof.
 */
export const findMultiAccountClusters = async (
  signal: ClusterSignal,
  limit = 100,
) => {
  const pipeline =
    signal === "device"
      ? [
          {
            $group: {
              _id: "$deviceId",
              uids: { $addToSet: "$uid" },
              lastSeenAt: { $max: "$lastSeenAt" },
            },
          },
        ]
      : [
          { $unwind: "$fingerprints" },
          {
            $group: {
              _id: "$fingerprints",
              uids: { $addToSet: "$uid" },
              lastSeenAt: { $max: "$lastSeenAt" },
            },
          },
        ];

  const groups = await devices()
    .aggregate<{ key: string; uids: string[]; lastSeenAt: Date }>([
      ...pipeline,
      { $match: { "uids.1": { $exists: true } } },
      { $project: { _id: 0, key: "$_id", uids: 1, lastSeenAt: 1 } },
    ])
    .toArray();
  if (groups.length === 0) {
    return [];
  }

  const [accounts, reviews] = await Promise.all([
    getDb()
      .collection("users")
      .find({
        uid: { $in: [...new Set(groups.flatMap((group) => group.uids))] },
      })
      .project<ClusterAccount>(clusterAccountProjection)
      .toArray(),
    reviewsCollection()
      .find({ signal, key: { $in: groups.map((group) => group.key) } })
      .toArray(),
  ]);
  const accountByUid = new Map(
    accounts.map((account) => [account.uid, account]),
  );
  const reviewedUids = new Map(
    reviews.map((review) => [review.key, new Set(review.uids)]),
  );

  return groups
    .map((group) => {
      const accounts = group.uids
        .map((uid) => accountByUid.get(uid))
        .filter((account): account is ClusterAccount => !!account)
        .sort(
          (a, b) =>
            (a.creationDate?.getTime() ?? 0) - (b.creationDate?.getTime() ?? 0),
        );
      return {
        signal,
        key: group.key,
        lastSeenAt: group.lastSeenAt,
        returning: hasReturningAccount(accounts),
        accounts,
      };
    })
    .filter((cluster) => {
      const active = cluster.accounts.filter((account) => !account.deleted);
      if (active.length < 2 && !cluster.returning) {
        return false;
      }
      // A dismissed group comes back once an account the moderator hasn't seen joins it.
      const reviewed = reviewedUids.get(cluster.key);
      return !reviewed || active.some((account) => !reviewed.has(account.uid));
    })
    .sort(
      (a, b) =>
        Number(b.returning) - Number(a.returning) ||
        b.accounts.length - a.accounts.length ||
        b.lastSeenAt.getTime() - a.lastSeenAt.getTime(),
    )
    .slice(0, limit);
};

export const dismissCluster = async (
  signal: ClusterSignal,
  key: string,
  uids: string[],
  reviewer: string,
) => {
  await reviewsCollection().updateOne(
    { signal, key },
    {
      $set: { reviewedBy: reviewer, reviewedAt: new Date() },
      $addToSet: { uids: { $each: uids } },
    },
    { upsert: true },
  );
};

/** Fills `canonicalEmail` for accounts created before it existed. Safe to rerun. */
export const backfillCanonicalEmails = async () => {
  const users = getDb().collection("users");
  const missing = await users
    .find({ canonicalEmail: { $exists: false }, email: { $type: "string" } })
    .project<{ _id: ObjectId; email: string }>({ email: 1 })
    .toArray();
  if (missing.length === 0) {
    return;
  }
  const result = await users.bulkWrite(
    missing.map((user) => ({
      updateOne: {
        filter: { _id: user._id },
        update: { $set: { canonicalEmail: canonicalEmail(user.email) } },
      },
    })),
    { ordered: false },
  );
  console.log(`Set canonicalEmail for ${result.modifiedCount} users`);
};
