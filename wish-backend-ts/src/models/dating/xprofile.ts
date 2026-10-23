import { ObjectId } from "mongodb";
import { getDb } from "../../databases/db/mongo";
import {
  partialTextMatch,
  partialTextPatterns,
} from "./pipeline-queries-helper";
import {
  currencyForCountry,
  DayAvailability,
  normalizeAvailability,
  UserType,
} from "./service-catalog";
import { publicRootProjection } from "../user";

// // // // // // //  POST // // // // // // // // // // // // //
export const createDetails = async (uid: string, profile: any) => {
  let collection = getDb().collection("users");

  const query = {
    uid,
  };

  const update = {
    $set: {
      ...(profile.country
        ? { ...profile, currency: currencyForCountry(profile.country) }
        : profile),
      updateDate: new Date(),
    },
  };

  let inserts = await collection.updateOne(query, update);

  return inserts;
};

export const createBirthdate = async (uid: string, profile: any) => {
  let collection = getDb().collection("users");

  const query = {
    uid,
  };

  const update = {
    $set: { ...profile, updateDate: new Date() },
  };

  let inserts = await collection.updateOne(query, update);

  return inserts;
};

export interface WorkProfile {
  services?: string[];
  hourlyRate?: number;
  availability?: DayAvailability[];
  areasCovered?: Array<{ country: string; location: string; locationName: string }>;
  openToRelocate?: boolean;
}

// Only cleaners cover areas; a client's home location is enough to find them.
export const createWork = async (
  uid: string,
  userType: UserType,
  work: WorkProfile
) => {
  const collection = getDb().collection("users");
  const user = await collection.findOne({ uid }, { projection: { country: 1 } });

  const areasCovered =
    userType === "Cleaner"
      ? (work.areasCovered ?? []).map(({ country, location, locationName }) => ({
          country,
          location,
          locationName,
        }))
      : [];

  return collection.updateOne(
    { uid },
    {
      $set: {
        services: work.services ?? [],
        hourlyRate: work.hourlyRate ?? null,
        currency: currencyForCountry(user?.country),
        availability: normalizeAvailability(work.availability ?? []),
        areasCovered,
        openToRelocate: userType === "Cleaner" && work.openToRelocate === true,
        updateDate: new Date(),
      },
    }
  );
};

export const createAbout = async (
  uid: string,
  about: { languages?: string[]; description?: string }
) => {
  const collection = getDb().collection("users");

  return collection.updateOne(
    { uid },
    {
      $set: {
        languages: about.languages ?? [],
        description: about.description ?? "",
        updateDate: new Date(),
      },
    }
  );
};

export const createOffer = async (uid: string, offer: string) => {
  let collection = getDb().collection("users");

  const query = {
    uid,
  };

  let date = new Date(new Date().toISOString());
  let _id = new ObjectId();

  const update = {
    $set: { updateDate: date },
    $addToSet: {
      offers: {
        _id,
        offer,
        date,
      },
    },
  };

  let inserts = await collection.updateOne(query, update);

  return inserts;
};

// // // // // // //  DELETE // // // // // // // // // // // //

export const deleteOffer = async (uid: string, offer: string) => {
  let collection = getDb().collection("users");

  const query = {
    uid,
  };

  const update = {
    $set: { updateDate: new Date() },
    $pull: { offers: { offer } },
  } as any;


  let inserts = await collection.updateOne(query, update);

  return inserts;
};

// // // // // // //  GET // // // // // // // // // // // // //

// export const getAllDetails = async (email: string) => {
//   let collection = getDb().collection("users");

//   const result = await collection.find({ email: email }).toArray();

//   return result;
// };

// export const getOffersGrouped = async (userType: string) => {
//   let collection = getDb().collection("users");

//   const items = await collection
//     .aggregate([
//       { $match: { "claims.user": userType } },
//       { $project: { uid: 1, offers: 1 } },
//       { $unwind: { path: "$offers" } },
//       {
//         $group: {
//           _id: "$offers",
//           user: { $push: "$uid" },
//         },
//       },
//     ])
//     .toArray();

//   return items;
// };

export const latestOffers = async (userType: string): Promise<any> => {
  let collection = getDb().collection("users");

  let match = { userType: userType };

  const offers = await collection
    .aggregate([
      { $match: match },
      { $unwind: "$offers" },
      {
        $addFields: {
          offer: "$offers",
          images: {
            $filter: {
              input: "$images",
              as: "image",
              cond: { $eq: ["$$image.isProfile", true] },
            },
          },
        },
      },
      { $project: { ...publicRootProjection, offers: 0 } },
      { $sort: { "offer.date": -1 } },
      { $limit: 5 },
    ])
    .toArray();

  return offers;
};

export const getGroupedOffers = async (
  userType: string,
  search: string
): Promise<any> => {
  let collection = getDb().collection("users");

  const patterns = partialTextPatterns(search ?? "");
  const offerMatching = (operator: "$and" | "$or") => ({
    $first: {
      $filter: {
        input: { $ifNull: ["$offers", []] },
        as: "o",
        cond: {
          [operator]: patterns.map((regex) => ({
            $regexMatch: { input: "$$o.offer", regex, options: "i" },
          })),
        },
      },
    },
  });

  const userOffers = await collection
    .aggregate([
      {
        $match: {
          userType: userType,
          ...partialTextMatch("offers.offer", search ?? "", "all"),
        },
      },
      { $sort: { creationDate: -1 } },
      {
        $addFields: {
          // Words can be spread over several offers, so fall back to one
          // that matches at least one of them.
          offer: { $ifNull: [offerMatching("$and"), offerMatching("$or")] },
          images: {
            $filter: {
              input: "$images",
              as: "image",
              cond: { $eq: ["$$image.isProfile", true] },
            },
          },
        },
      },
      { $project: { ...publicRootProjection, offers: 0 } },
      { $limit: 5 },
    ])
    .toArray();

  return userOffers;
};

// export const getDetails = async (userId: string) => {
//   let collection = getDb().collection("users");

//   const projection = { location: 1, country: 1, year: 1, month: 1, day: 1 };
//   const result = await collection
//     .find({ uid: userId })
//     .project(projection)
//     .toArray();

//   return result;
// };

// export const getMeasures = async (userId: string) => {
//   let collection = getDb().collection("users");

//   const projection = { height: 1, weight: 1, bust: 1 };
//   const result = await collection
//     .find({ uid: userId })
//     .project(projection)
//     .toArray();

//   return result;
// };

// export const getAdditional = async (userId: string) => {
//   let collection = getDb().collection("users");

//   const projection = { eyes: 1, language: 1 };
//   const result = await collection
//     .find({ uid: userId })
//     .project(projection)
//     .toArray();

//   return result;
// };
