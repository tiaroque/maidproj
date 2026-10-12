import { getDb } from "../../databases/db/mongo";
import { withLikedByMe } from "./likes";
import { withVisitedByMe } from "./visits";

const LIMIT = 60;

const relatedProfiles = (
  collectionName: "profile_likes" | "profile_visits",
  matchField: "likedUid" | "visitedUid" | "likerUid",
  profileField: "likerUid" | "visitorUid" | "likedUid",
  sortField: "createdAt" | "lastVisitedAt",
  meUid: string,
  blockedByMe: string[]
) =>
  getDb()
    .collection(collectionName)
    .aggregate([
      { $match: { [matchField]: meUid } },
      { $sort: { [sortField]: -1 } },
      {
        $lookup: {
          from: "users",
          localField: profileField,
          foreignField: "uid",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $match: {
          "user.deleted": { $ne: true },
          "user.uid": { $ne: meUid },
        },
      },
      {
        $match: {
          $expr: {
            $and: [
              { $not: [{ $in: ["$user.uid", blockedByMe] }] },
              {
                $not: [{ $in: [meUid, { $ifNull: ["$user.blocked", []] }] }],
              },
            ],
          },
        },
      },
      { $limit: LIMIT },
      {
        $set: {
          "user.age": {
            $dateDiff: {
              startDate: "$user.birthDate",
              endDate: "$$NOW",
              unit: "year",
            },
          },
          "user.images": {
            $filter: {
              input: { $ifNull: ["$user.images", []] },
              as: "image",
              cond: { $eq: ["$$image.isProfile", true] },
            },
          },
        },
      },
      ...withLikedByMe(meUid),
      ...withVisitedByMe(meUid),
      {
        $project: {
          myLike: 0,
          myVisit: 0,
          likerUid: 0,
          likedUid: 0,
          visitorUid: 0,
          visitedUid: 0,
          createdAt: 0,
          lastVisitedAt: 0,
          "user.password": 0,
          "user.email": 0,
          "user.emailVerifyToken": 0,
          "user.emailVerifyExpires": 0,
          "user.phoneNumber": 0,
          "user.lastname": 0,
          "user.birthDate": 0,
          "user.birthDateStr": 0,
          "user.claims": 0,
          "user.blocked": 0,
          "user.additionalUserInfo": 0,
        },
      },
    ])
    .toArray();

export const getActivity = (
  meUid: string,
  blockedByMe: string[] = []
) =>
  Promise.all([
    relatedProfiles(
      "profile_likes",
      "likedUid",
      "likerUid",
      "createdAt",
      meUid,
      blockedByMe
    ),
    relatedProfiles(
      "profile_likes",
      "likerUid",
      "likedUid",
      "createdAt",
      meUid,
      blockedByMe
    ),
    relatedProfiles(
      "profile_visits",
      "visitedUid",
      "visitorUid",
      "lastVisitedAt",
      meUid,
      blockedByMe
    ),
  ]).then(([likes, myLikes, visits]) => ({ likes, myLikes, visits }));
