/**
 * Moves availability from two separate lists to slots per day.
 *
 *   npm run migrate:availability            dry run, prints the count
 *   npm run migrate:availability -- --yes   applies the changes
 *
 * { days: ["mon", "tue"], slots: ["morning"] } becomes
 * [{ day: "mon", slots: ["morning"] }, { day: "tue", slots: ["morning"] }].
 * Days without slots used to mean "any time", so they get every slot.
 */
import { close, connectMongo, getDb } from "../databases/db/mongo";
import { normalizeAvailability, SLOTS } from "../models/dating/service-catalog";

const run = async (apply: boolean) => {
  await connectMongo();
  const users = getDb().collection("users");

  const legacy = await users
    .find(
      { availability: { $exists: true, $not: { $type: "array" } } },
      { projection: { _id: 1, availability: 1 } }
    )
    .toArray();
  console.log(`with legacy availability: ${legacy.length}`);

  if (!apply) {
    console.log("Dry run. Pass --yes to apply.");
    return;
  }

  if (legacy.length) {
    await users.bulkWrite(
      legacy.map(({ _id, availability }) => {
        const days: string[] = availability?.days ?? [];
        const slots: string[] = availability?.slots?.length
          ? availability.slots
          : [...SLOTS];
        return {
          updateOne: {
            filter: { _id },
            update: {
              $set: {
                availability: normalizeAvailability(
                  days.map((day) => ({ day, slots }))
                ),
              },
            },
          },
        };
      })
    );
  }

  console.log("Done.");
};

run(process.argv.includes("--yes"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => close());
