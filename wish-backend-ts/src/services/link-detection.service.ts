import { MongoServerError } from "mongodb";
import { getDb } from "../databases/db/mongo";
import {
  ClusterAccount,
  clusterAccountProjection,
} from "./device-tracking.service";

export type LinkFlagSource = "profile" | "chat";

type LinkFlag = {
  uid: string;
  source: LinkFlagSource;
  field: string;
  status: "pending" | "dismissed";
  excerpt: string;
  links: string[];
  count: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
};

const maxExcerptLength = 300;
const maxLinksPerFlag = 10;

// Bare domains only count with a known TLD, so "e.g." or "1.80m" don't match.
const tlds = [
  "com",
  "net",
  "org",
  "info",
  "biz",
  "io",
  "co",
  "me",
  "app",
  "link",
  "site",
  "online",
  "xyz",
  "club",
  "live",
  "shop",
  "store",
  "page",
  "ly",
  "gl",
  "gg",
  "to",
  "tv",
  "cc",
  "ws",
  "sh",
  "pt",
  "br",
  "es",
  "fr",
  "de",
  "it",
  "nl",
  "be",
  "ch",
  "at",
  "uk",
  "eu",
  "us",
  "ru",
  "ua",
  "pl",
  "ro",
].join("|");

const linkPattern = new RegExp(
  [
    String.raw`(?:https?:\/\/|www\.)[^\s<>"']+`,
    String.raw`(?:[\w.+-]+@)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:${tlds})\b(?:\/[^\s<>"']*)?`,
    // "mysite dot com", "mysite (ponto) pt" and similar ways around the filter.
    String.raw`\b[a-z0-9-]{2,}\s*[([{]?\s*(?:dot|ponto|punto|point|punkt|punt)\s*[)\]}]?\s*(?:${tlds})\b`,
  ].join("|"),
  "gi",
);

const hostOf = (link: string) =>
  link
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^[^@/]*@/, "")
    .split(/[/?#:]/)[0];

const isOwnHost = (host: string) =>
  host === "clara.com" || host.endsWith(".clara.com");

export const findLinks = (text: string) => {
  const links = new Set<string>();
  for (const [match] of text.matchAll(linkPattern)) {
    const link = match.replace(/[.,;:!?)\]}]+$/, "");
    if (!isOwnHost(hostOf(link))) {
      links.add(link);
    }
  }
  return [...links].slice(0, maxLinksPerFlag);
};

const excerptAround = (text: string, link: string) => {
  if (text.length <= maxExcerptLength) {
    return text;
  }
  const start = Math.max(0, text.indexOf(link) - maxExcerptLength / 3);
  const excerpt = text.slice(start, start + maxExcerptLength);
  return `${start > 0 ? "…" : ""}${excerpt}${start + maxExcerptLength < text.length ? "…" : ""}`;
};

const flags = () => getDb().collection<LinkFlag>("link_flags");

const isDuplicateKey = (error: unknown) =>
  error instanceof MongoServerError && error.code === 11000;

const recordFlag = async (
  uid: string,
  source: LinkFlagSource,
  field: string,
  text: string,
  links: string[],
) => {
  const now = new Date();
  const write = () =>
    flags().updateOne(
      { uid, source, field, status: "pending" },
      {
        $set: {
          excerpt: excerptAround(text, links[0]),
          links,
          lastSeenAt: now,
        },
        $setOnInsert: { firstSeenAt: now },
        $inc: { count: 1 },
      },
      { upsert: true },
    );
  try {
    await write();
  } catch (error) {
    // Two concurrent upserts race on the unique index; the retry updates the winner.
    if (!isDuplicateKey(error)) {
      throw error;
    }
    await write();
  }
};

/**
 * Records a pending flag for each field whose text contains a link.
 * Never throws, so flagging can't block the save it is attached to.
 */
export const flagLinks = (
  uid: string,
  source: LinkFlagSource,
  fields: Record<string, unknown>,
) => {
  const writes = Object.entries(fields).flatMap(([field, value]) => {
    const text = Array.isArray(value)
      ? value.filter((item) => typeof item === "string").join(", ")
      : typeof value === "string"
        ? value
        : "";
    const links = text ? findLinks(text) : [];
    return links.length > 0
      ? [recordFlag(uid, source, field, text, links)]
      : [];
  });
  Promise.all(writes).catch((error) =>
    console.error("Failed to record link flag", error),
  );
};

export const findLinkFlags = async (limit = 100) => {
  const groups = await flags()
    .aggregate<{
      uid: string;
      lastSeenAt: Date;
      flags: Pick<
        LinkFlag,
        "source" | "field" | "excerpt" | "links" | "count" | "lastSeenAt"
      >[];
    }>([
      { $match: { status: "pending" } },
      { $sort: { lastSeenAt: -1 } },
      {
        $group: {
          _id: "$uid",
          lastSeenAt: { $first: "$lastSeenAt" },
          flags: {
            $push: {
              source: "$source",
              field: "$field",
              excerpt: "$excerpt",
              links: "$links",
              count: "$count",
              lastSeenAt: "$lastSeenAt",
            },
          },
        },
      },
      { $project: { _id: 0, uid: "$_id", lastSeenAt: 1, flags: 1 } },
    ])
    .toArray();
  if (groups.length === 0) {
    return [];
  }

  const accounts = await getDb()
    .collection("users")
    .find({
      uid: { $in: groups.map((group) => group.uid) },
      deleted: { $ne: true },
    })
    .project<ClusterAccount>(clusterAccountProjection)
    .toArray();
  const accountByUid = new Map(
    accounts.map((account) => [account.uid, account]),
  );

  return groups
    .filter((group) => accountByUid.has(group.uid))
    .map((group) => ({ ...group, account: accountByUid.get(group.uid)! }))
    .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime())
    .slice(0, limit);
};

/** Clears a user's pending flags. Links posted afterwards flag them again. */
export const dismissLinkFlags = async (uid: string, reviewer: string) => {
  await flags().updateMany(
    { uid, status: "pending" },
    {
      $set: {
        status: "dismissed",
        reviewedBy: reviewer,
        reviewedAt: new Date(),
      },
    },
  );
};
