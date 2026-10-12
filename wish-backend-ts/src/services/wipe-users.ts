import { getDb } from "../databases/db/mongo";

/**
 * Deletes every account in the users collection.
 * Runs only when the process is production, and only at startup.
 */
export const wipeProductionUsers = async () => {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const result = await getDb().collection("users").deleteMany({});
  console.log(`Removed ${result.deletedCount} users from the production database`);
};
