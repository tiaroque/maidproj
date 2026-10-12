/**
 * Moves accounts created on the dating version to the cleaning marketplace.
 *
 *   npm run migrate:cleaning            dry run, prints the counts
 *   npm run migrate:cleaning -- --yes   applies the changes
 *
 * Daddy becomes Client (they hired) and Baby becomes Cleaner (they offered).
 * The dating-only fields are removed; offers stay and are shown as
 * announcements (cleaners) or job requests (clients).
 */
import { close, connectMongo, getDb } from "../databases/db/mongo";
import { currencyForCountry } from "../models/dating/service-catalog";

const ROLE_MAP: Record<string, string> = {
  Daddy: "Client",
  Baby: "Cleaner",
  Babe: "Cleaner",
};

const DATING_FIELDS = [
  "height",
  "weight",
  "bust",
  "eyes",
  "sportHobbies",
  "nationality",
  "qualifications",
  "profession",
];

const run = async (apply: boolean) => {
  await connectMongo();
  const users = getDb().collection("users");

  for (const [from, to] of Object.entries(ROLE_MAP)) {
    const filter = { userType: from };
    const count = await users.countDocuments(filter);
    console.log(`${from} -> ${to}: ${count}`);
    if (apply && count) {
      await users.updateMany(filter, {
        $set: { userType: to, "claims.user": to },
      });
    }
  }

  const withDatingFields = {
    $or: DATING_FIELDS.map((field) => ({ [field]: { $exists: true } })),
  };
  console.log(
    `with dating fields: ${await users.countDocuments(withDatingFields)}`
  );

  const withoutCurrency = { currency: { $exists: false } };
  const missingCurrency = await users
    .find(withoutCurrency, { projection: { _id: 1, country: 1 } })
    .toArray();
  console.log(`without currency: ${missingCurrency.length}`);

  if (!apply) {
    console.log("Dry run. Pass --yes to apply.");
    return;
  }

  await users.updateMany(withDatingFields, {
    $unset: Object.fromEntries(DATING_FIELDS.map((field) => [field, ""])),
  });

  if (missingCurrency.length) {
    await users.bulkWrite(
      missingCurrency.map((user) => ({
        updateOne: {
          filter: { _id: user._id },
          update: { $set: { currency: currencyForCountry(user.country) } },
        },
      }))
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
