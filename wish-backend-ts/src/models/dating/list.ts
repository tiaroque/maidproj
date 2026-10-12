import { getDb } from "../../databases/db/mongo";
import {
  filterBlockedUsers,
  partialTextMatch,
} from "./pipeline-queries-helper";
import { publicUserProjection } from "../user";
import { withLikedByMe } from "./likes";
import { withVisitedByMe } from "./visits";
import { UserType } from "./service-catalog";

export interface GlobalFilters {
  country: string;
  location: string;
  languages: string[];
  services: string[];
  days: string[];
  slots: string[];
  rate: string[];
  onlineOnly: boolean;
  verifiedOnly: boolean;
}

export interface GlobalQuickFilters {
  userType: string;
  country: string;
  location: string;
  service: string;
}

const locationFilter = (location: string) => ({
  $regex: `^${location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
});

// A member matches a place when they live there or, for cleaners, when one of
// the areas they cover is inside it.
const placeMatch = (country?: string, location?: string) => {
  if (!country) {
    return {};
  }
  const home: any = { country };
  const area: any = { country };
  if (location) {
    home.location = locationFilter(location);
    area.location = locationFilter(location);
  }
  return { $or: [home, { areasCovered: { $elemMatch: area } }] };
};

export const getList = async (
  userMeId: string,
  sortOrder: string,
  pageNumber: number,
  pageSize: number,
  userType: UserType,
  searchTerms: string,
  globalFilters: GlobalFilters,
  onlineUserIds: string[]
) => {
  // console.log(globalFilters);
  let collection = getDb().collection("users");
  // const startIndex = parseInt(pageNumber) * parseInt(pageSize);
  // const ps = parseInt(pageSize);

  let queryList: any[] = [
    {
      $match: {
        userType: userType,
      },
    },
  ];

  // adds text search to query
  if (searchTerms?.trim()) {
    queryList[0].$match = Object.assign(
      queryList[0].$match,
      partialTextMatch("offers.offer", searchTerms, "any")
    );
  }

  const match = queryList[0].$match;

  Object.assign(match, placeMatch(globalFilters.country, globalFilters.location));

  if (globalFilters.services?.length) {
    match.services = { $in: globalFilters.services };
  }

  if (globalFilters.days?.length) {
    match["availability.days"] = { $in: globalFilters.days };
  }

  if (globalFilters.slots?.length) {
    match["availability.slots"] = { $in: globalFilters.slots };
  }

  if (globalFilters.rate?.length === 2) {
    match.hourlyRate = {
      $gte: +globalFilters.rate[0],
      $lte: +globalFilters.rate[1],
    };
  }

  if (globalFilters.languages?.length) {
    match.languages = { $in: globalFilters.languages };
  }

  if (globalFilters.onlineOnly) {
    match.uid = { $in: onlineUserIds };
  }

  if (globalFilters.verifiedOnly) {
    match.verified = true;
  }

  const items = await collection
    .aggregate([
      ...queryList,
      ...filterBlockedUsers(userMeId),
      {
        $set: {
          images: {
            $filter: {
              input: "$images",
              as: "image",
              cond: { $eq: ["$$image.isProfile", true] },
            },
          },
        },
      },
      {
        $project: {
          user: "$$ROOT",
        },
      },

      { $sort: { creationDate: -1 } },

      {
        $facet: {
          metadata: [{ $count: "totalCount" }],
          data: [
            { $skip: (pageNumber - 1) * pageSize },
            { $limit: pageSize },
            ...withLikedByMe(userMeId),
            ...withVisitedByMe(userMeId),
            { $set: { isOnline: { $in: ["$user.uid", onlineUserIds] } } },
            { $project: { ...publicUserProjection, "user.blocked": 0 } },
            {
              $project: {
                "user.additionalUserInfo": 0,
                "user.blockedByMeListOfList": 0,
                myLike: 0,
                myVisit: 0,
              },
            },
          ],
        },
      },
    ])
    .toArray();

  return items;
};

export const getLastestUsers = async (
  userMeId: string,
  userType: UserType
) => {
  let collection = getDb().collection("users");

  let queryList: any[] = [
    {
      $match: {
        userType: userType,
      },
    },
  ];


  const items = await collection
    .aggregate([
      ...queryList,
      ...filterBlockedUsers(userMeId),
      {
        $set: {
          images: {
            $filter: {
              input: "$images",
              as: "image",
              cond: { $eq: ["$$image.isProfile", true] },
            },
          },
        },
      },
      {
        $project: {
          user: "$$ROOT",
        },
      },
      { $project: publicUserProjection },
      { $sort: { "user.creationDate": -1 } },
      { $limit: 6 },
    ])
    .toArray();

  return items;
};

export const getLastestUsersBlured = async (
  globalFilters: GlobalQuickFilters
) => {
  let collection = getDb().collection("users");

  const match: any = {
    deleted: { $ne: true },
    ...placeMatch(globalFilters.country, globalFilters.location),
  };

  if (globalFilters.userType) {
    match.userType = globalFilters.userType;
  }

  if (globalFilters.service) {
    match.services = globalFilters.service;
  }

  const items = await collection
    .aggregate([
      { $match: match },
      {
        $set: {
          images: {
            $filter: {
              input: "$images",
              as: "image",
              cond: { $eq: ["$$image.isProfile", true] },
            },
          },
        },
      },
      {
        $project: {
          "images.key": 0,
          "images.keyRezised": 0,
        },
      },
      {
        $project: {
          user: "$$ROOT",
        },
      },
      { $project: publicUserProjection },
      { $sort: { "user.creationDate": -1 } },
      { $limit: 16 },
    ])
    .toArray();

  return items;
};

// Newest announcement or job request per member, for the public landing page.
// Only the blurred photo key may leave the server here.
export const getLatestOffersBlured = async (limit = 6) => {
  let collection = getDb().collection("users");

  return collection
    .aggregate([
      { $match: { deleted: { $ne: true }, "offers.0": { $exists: true } } },
      { $unwind: "$offers" },
      { $match: { "offers.offer": { $nin: [null, ""] } } },
      { $sort: { "offers.date": -1 } },
      { $group: { _id: "$_id", doc: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$doc" } },
      { $sort: { "offers.date": -1 } },
      { $limit: limit },
      {
        $set: {
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
      {
        $project: {
          offers: 0,
          additionalUserInfo: 0,
          "images.key": 0,
          "images.keyRezised": 0,
        },
      },
      { $project: { user: "$$ROOT" } },
      { $project: publicUserProjection },
    ])
    .toArray();
};

// Public profiles for the sitemap: only the id and a last-modified hint.
// Profiles without a name are skipped; they render as thin pages.
export const getSitemapProfiles = async (limit = 5000) => {
  return getDb()
    .collection("users")
    .find(
      {
        deleted: { $ne: true },
        uid: { $exists: true },
        name: { $nin: [null, ""] },
      },
      { projection: { _id: 0, uid: 1, creationDate: 1 } }
    )
    .sort({ creationDate: -1 })
    .limit(limit)
    .toArray();
};
