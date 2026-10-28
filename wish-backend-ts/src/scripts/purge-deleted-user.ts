/**
 * Permanently removes everything stored for an account that was closed
 * through DELETE /api/users/me (users.deleted === true).
 *
 *   npm run purge:user -- <uid|email>            dry run, prints what would go
 *   npm run purge:user -- <uid|email> --yes      deletes it
 *   npm run purge:user -- --all-deleted [--yes]  every account flagged deleted
 *
 * Conversations the user took part in are removed for both sides, together
 * with every message and chat photo in them.
 */
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { ObjectId } from "mongodb";
import config from "../endpoints.config";
import { close, connectMongo, getDb } from "../databases/db/mongo";
import { s3Client } from "../services/file-upload";

const PHOTO_PREFIXES = ["pictures", "pictures-resized", "pictures-blured"];
const CHAT_PREFIXES = ["chat", "chat-resized"];
const IMAGE_KEY_FIELDS = ["key", "keyRezised", "keyBlured"];
const S3_DELETE_BATCH = 1000;

type PurgeUser = {
  _id: ObjectId;
  uid: string;
  email: string;
  images?: Record<string, unknown>[];
};

const imageKeys = (image: unknown) => {
  if (!image || typeof image !== "object") {
    return [];
  }
  return IMAGE_KEY_FIELDS.map(
    (field) => (image as Record<string, unknown>)[field],
  ).filter((key): key is string => typeof key === "string" && key.length > 0);
};

const listKeys = async (prefix: string, bucket = config.AWSBucketName) => {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const page = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: token,
      }),
    );
    page.Contents?.forEach((item) => item.Key && keys.push(item.Key));
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return keys;
};

const deleteKeys = async (keys: string[], bucket = config.AWSBucketName) => {
  for (let i = 0; i < keys.length; i += S3_DELETE_BATCH) {
    const batch = keys.slice(i, i + S3_DELETE_BATCH);
    const { Errors } = await s3Client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
      }),
    );
    if (Errors?.length) {
      throw new Error(
        `S3 refused ${Errors.length} deletes, first: ${Errors[0].Key} ${Errors[0].Message}`,
      );
    }
  }
};

const collectS3Keys = async (
  user: PurgeUser,
  conversationIds: ObjectId[],
) => {
  const keys = new Set<string>();
  (user.images ?? []).forEach((image) =>
    imageKeys(image).forEach((key) => keys.add(key)),
  );

  const chatImages = await getDb()
    .collection("messages")
    .find({ conversationId: { $in: conversationIds }, type: "media" })
    .project<{ message?: unknown }>({ _id: 0, message: 1 })
    .toArray();
  chatImages.forEach((item) =>
    imageKeys(item.message).forEach((key) => keys.add(key)),
  );

  if (!config.AWSBucketName) {
    return [...keys];
  }

  // Older uploads are stored under the owner's email instead of the uid.
  const owners = [user.uid, user.email].filter(Boolean);
  const prefixes = [
    ...PHOTO_PREFIXES.flatMap((prefix) =>
      owners.map((owner) => `${prefix}/${owner}/`),
    ),
    ...CHAT_PREFIXES.map((prefix) => `${prefix}/${user.uid}/`),
  ];
  for (const prefix of prefixes) {
    (await listKeys(prefix)).forEach((key) => keys.add(key));
  }

  return [...keys];
};

const purgeUser = async (user: PurgeUser, apply: boolean) => {
  const db = getDb();
  const { uid, email } = user;

  const conversations = db.collection("conversations");
  const conversationIds = (
    await conversations
      .find({ participants: uid })
      .project<{ _id: ObjectId }>({ _id: 1 })
      .toArray()
  ).map((item) => item._id);

  const s3Keys = await collectS3Keys(user, conversationIds);
  const selfieKeys = config.AWSVerificationBucketName
    ? await listKeys(`verification/${uid}/`, config.AWSVerificationBucketName)
    : [];

  const filters = {
    messages: { conversationId: { $in: conversationIds } },
    conversations: { _id: { $in: conversationIds } },
    profile_likes: { $or: [{ likerUid: uid }, { likedUid: uid }] },
    profile_visits: { $or: [{ visitorUid: uid }, { visitedUid: uid }] },
    passkeys: { uid },
    push_subscriptions: { uid },
    webauthn_challenges: { uid },
    verifications: { uid },
    contactus: { $or: [{ userId: uid }, { userEmail: email }] },
  };

  console.log(`\n${apply ? "Purging" : "Would purge"} ${email} (${uid})`);
  for (const [name, filter] of Object.entries(filters)) {
    console.log(
      `  ${name}: ${await db.collection(name).countDocuments(filter)}`,
    );
  }
  console.log(
    `  users.blocked references: ${await db
      .collection("users")
      .countDocuments({ blocked: uid })}`,
  );
  console.log(`  s3 objects: ${s3Keys.length}`);
  console.log(`  verification selfies: ${selfieKeys.length}`);
  if (!config.AWSBucketName) {
    console.log("  (AWSBucketName not set, S3 objects are not listed or deleted)");
  }

  if (!apply) {
    return;
  }

  // Files go first so a failure leaves the database rows needed to retry.
  if (config.AWSBucketName && s3Keys.length) {
    await deleteKeys(s3Keys);
  }
  if (selfieKeys.length) {
    await deleteKeys(selfieKeys, config.AWSVerificationBucketName);
  }

  for (const [name, filter] of Object.entries(filters)) {
    await db.collection(name).deleteMany(filter);
  }
  await db
    .collection("users")
    .updateMany({ blocked: uid }, { $pull: { blocked: uid } } as any);
  await db.collection("users").deleteOne({ _id: user._id, deleted: true });

  console.log("  done");
};

const main = async () => {
  const args = process.argv.slice(2);
  const apply = args.includes("--yes");
  const all = args.includes("--all-deleted");
  const target = args.find((arg) => !arg.startsWith("--"));

  if (!all && !target) {
    console.error(
      "Usage: npm run purge:user -- <uid|email> [--yes]\n" +
        "       npm run purge:user -- --all-deleted [--yes]",
    );
    process.exit(1);
  }

  await connectMongo();
  try {
    const users = getDb().collection<PurgeUser & { deleted?: boolean }>(
      "users",
    );
    const projection = { _id: 1, uid: 1, email: 1, images: 1, deleted: 1 };

    const found = all
      ? await users.find({ deleted: true }).project<PurgeUser>(projection).toArray()
      : await users
          .find({
            $or: [{ uid: target }, { email: target!.toLowerCase().trim() }],
          })
          .project<PurgeUser & { deleted?: boolean }>(projection)
          .toArray();

    if (!found.length) {
      console.log(all ? "No deleted accounts found." : `No user matches ${target}.`);
      return;
    }

    for (const user of found) {
      if (!(user as { deleted?: boolean }).deleted) {
        console.error(
          `${user.email} (${user.uid}) is not marked deleted, skipping. ` +
            "The account must be closed from the app first.",
        );
        process.exitCode = 1;
        continue;
      }
      await purgeUser(user, apply);
    }

    if (!apply) {
      console.log("\nDry run only. Re-run with --yes to delete.");
    }
  } finally {
    await close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
