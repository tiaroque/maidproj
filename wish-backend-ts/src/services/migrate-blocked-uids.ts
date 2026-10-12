import { AnyBulkWriteOperation, Document } from "mongodb";
import { getDb } from "../databases/db/mongo";

const isEmail = (value: unknown): value is string =>
  typeof value === "string" && value.includes("@");

/**
 * Rewrites `users.blocked` entries from emails to uids. Emails with no
 * matching account belong to purged users and are dropped. Safe to rerun.
 */
export const migrateBlockedToUids = async () => {
  const users = getDb().collection("users");
  const affected = await users
    .find({ blocked: { $regex: "@" } })
    .project<{ _id: Document["_id"]; blocked: unknown[] }>({ blocked: 1 })
    .toArray();

  if (affected.length === 0) {
    return;
  }

  const emails = [
    ...new Set(affected.flatMap((user) => user.blocked.filter(isEmail))),
  ];
  const owners = await users
    .find({ email: { $in: emails } })
    .project<{ email: string; uid: string }>({ _id: 0, email: 1, uid: 1 })
    .toArray();
  const uidByEmail = new Map(owners.map((owner) => [owner.email, owner.uid]));

  const operations: AnyBulkWriteOperation[] = affected.map((user) => {
    const blocked = user.blocked.flatMap((entry) => {
      if (!isEmail(entry)) {
        return [entry];
      }
      const uid = uidByEmail.get(entry);
      return uid ? [uid] : [];
    });
    return {
      updateOne: {
        filter: { _id: user._id, blocked: user.blocked },
        update: { $set: { blocked: [...new Set(blocked)] } },
      },
    };
  });

  const result = await users.bulkWrite(operations, { ordered: false });
  console.log(`Converted blocked lists to uids for ${result.modifiedCount} users`);
};
