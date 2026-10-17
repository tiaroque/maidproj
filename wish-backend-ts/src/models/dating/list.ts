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
  openToRelocateOnly: boolean;
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

  // Days and slots must meet on the same day: Monday + morning only matches
  // members free on Monday morning.
  const dayMatch: any = {};
  if (globalFilters.days?.length) {
    dayMatch.day = { $in: globalFilters.days };
  }
  if (globalFilters.slots?.length) {
    dayMatch.slots = { $in: globalFilters.slots };
  }
  if (Object.keys(dayMatch).length) {
    match.availability = { $elemMatch: dayMatch };
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

  if (globalFilters.openToRelocateOnly) {
    match.openToRelocate = true;
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

export interface SitemapLocationService {
  service: string;
  count: number;
  indexable: boolean;
}

export interface SitemapLocation {
  country: string;
  location: string;
  locationName: string;
  count: number;
  /** Whether the place has enough cleaners to be worth a search result. */
  indexable: boolean;
  services: SitemapLocationService[];
}

const positiveEnv = (name: string, fallback: number) => {
  const parsed = Number(process.env[name]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

// A place needs PAGE_MIN cleaners to get a browse page at all, and INDEX_MIN to
// be worth indexing. Between the two it still renders and still collects
// internal links, but carries noindex, so a half-empty listing never becomes a
// search result. A page crosses into the index on its own as supply grows.
// Service pages sit on a lower index bar, since one service is only ever a
// slice of the cleaners in a place.
const PAGE_MIN = () => positiveEnv("BROWSE_PAGE_MIN_PROFILES", 1);
const INDEX_MIN = () => positiveEnv("BROWSE_INDEX_MIN_PROFILES", 5);
const SERVICE_INDEX_MIN = () =>
  positiveEnv("BROWSE_SERVICE_INDEX_MIN_PROFILES", 3);

// Cleaners are findable where they live and in every area they cover, which is
// how placeMatch() filters the listing, so both are counted here. One cleaner
// reachable in a place through several of those routes still counts once,
// hence the distinct uid sets rather than plain sums.
export const getSitemapLocations = async (
  pageMin = PAGE_MIN(),
  indexMin = INDEX_MIN(),
  serviceIndexMin = SERVICE_INDEX_MIN()
): Promise<SitemapLocation[]> => {
  const [result] = await getDb()
    .collection("users")
    .aggregate<{
      locations: Array<Omit<SitemapLocation, "indexable" | "services">>;
      services: Array<{
        country: string;
        location: string;
        service: string;
        count: number;
      }>;
    }>([
      {
        $match: {
          deleted: { $ne: true },
          uid: { $exists: true },
          name: { $nin: [null, ""] },
          userType: "Cleaner",
        },
      },
      {
        $project: {
          uid: 1,
          services: { $ifNull: ["$services", []] },
          places: {
            $filter: {
              input: {
                $concatArrays: [
                  [
                    {
                      country: "$country",
                      location: "$location",
                      locationName: "$locationName",
                    },
                  ],
                  { $ifNull: ["$areasCovered", []] },
                ],
              },
              as: "place",
              cond: {
                $and: [
                  { $gt: [{ $ifNull: ["$$place.country", ""] }, ""] },
                  { $gt: [{ $ifNull: ["$$place.locationName", ""] }, ""] },
                ],
              },
            },
          },
        },
      },
      { $unwind: "$places" },
      {
        $facet: {
          locations: [
            {
              $group: {
                _id: {
                  country: "$places.country",
                  location: "$places.location",
                },
                // Cleaners covering the same place can hold slightly different
                // lineage depths, so one spelling of the name has to win.
                locationName: { $first: "$places.locationName" },
                uids: { $addToSet: "$uid" },
              },
            },
            {
              $project: {
                _id: 0,
                country: "$_id.country",
                location: "$_id.location",
                locationName: 1,
                count: { $size: "$uids" },
              },
            },
            { $match: { count: { $gte: pageMin } } },
            { $sort: { count: -1 } },
          ],
          services: [
            { $unwind: "$services" },
            {
              $group: {
                _id: {
                  country: "$places.country",
                  location: "$places.location",
                  service: "$services",
                },
                uids: { $addToSet: "$uid" },
              },
            },
            {
              $project: {
                _id: 0,
                country: "$_id.country",
                location: "$_id.location",
                service: "$_id.service",
                count: { $size: "$uids" },
              },
            },
            { $match: { count: { $gte: pageMin } } },
            { $sort: { count: -1 } },
          ],
        },
      },
    ])
    .toArray();

  const servicesByPlace = new Map<string, SitemapLocationService[]>();
  for (const entry of result?.services ?? []) {
    const key = `${entry.country}${entry.location}`;
    const list = servicesByPlace.get(key) ?? [];
    list.push({
      service: entry.service,
      count: entry.count,
      indexable: entry.count >= serviceIndexMin,
    });
    servicesByPlace.set(key, list);
  }

  return (result?.locations ?? []).map((location) => ({
    ...location,
    indexable: location.count >= indexMin,
    services:
      servicesByPlace.get(`${location.country}${location.location}`) ?? [],
  }));
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
