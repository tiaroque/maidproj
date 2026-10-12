import { getDb } from "../../databases/db/mongo";
import { MongoServerError } from "mongodb";

export interface ProfileVisit {
  visitorUid: string;
  visitedUid: string;
  createdAt: Date;
  lastVisitedAt: Date;
}

const visits = () => getDb().collection<ProfileVisit>("profile_visits");

export const visitProfile = async (visitorUid: string, visitedUid: string) => {
  const now = new Date();

  try {
    return await visits().findOneAndUpdate(
      { visitorUid, visitedUid },
      {
        $setOnInsert: { visitorUid, visitedUid, createdAt: now },
        $set: { lastVisitedAt: now },
      },
      { upsert: true, returnDocument: "after" }
    );
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return visits().findOneAndUpdate(
        { visitorUid, visitedUid },
        { $set: { lastVisitedAt: now } },
        { returnDocument: "after" }
      );
    }
    throw error;
  }
};

// Marks profiles on the current page that the signed-in user has already opened.
export const withVisitedByMe = (visitorUid: string) => [
  {
    $lookup: {
      from: "profile_visits",
      let: { profileUid: "$user.uid" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$visitedUid", "$$profileUid"] },
                { $eq: ["$visitorUid", visitorUid] },
              ],
            },
          },
        },
        { $limit: 1 },
        { $project: { _id: 1 } },
      ],
      as: "myVisit",
    },
  },
  {
    $set: {
      visitedByMe: { $gt: [{ $size: "$myVisit" }, 0] },
    },
  },
];
