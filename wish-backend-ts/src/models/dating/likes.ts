import { getDb } from "../../databases/db/mongo";
import { MongoServerError } from "mongodb";

export interface ProfileLike {
  likerUid: string;
  likedUid: string;
  createdAt: Date;
}

const likes = () => getDb().collection<ProfileLike>("profile_likes");

export const likeProfile = async (likerUid: string, likedUid: string) => {
  const createdAt = new Date();

  try {
    const result = await likes().findOneAndUpdate(
      { likerUid, likedUid },
      { $setOnInsert: { likerUid, likedUid, createdAt } },
      { upsert: true, returnDocument: "after", includeResultMetadata: true }
    );
    return {
      like: result.value,
      isNew: !result.lastErrorObject?.updatedExisting,
    };
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return { like: await likes().findOne({ likerUid, likedUid }), isNew: false };
    }
    throw error;
  }
};

export const unlikeProfile = async (likerUid: string, likedUid: string) => {
  const result = await likes().deleteOne({ likerUid, likedUid });
  return result.deletedCount > 0;
};

// Marks profiles on the current page that the signed-in user has already liked.
export const withLikedByMe = (likerUid: string) => [
  {
    $lookup: {
      from: "profile_likes",
      let: { profileUid: "$user.uid" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$likedUid", "$$profileUid"] },
                { $eq: ["$likerUid", likerUid] },
              ],
            },
          },
        },
        { $limit: 1 },
        { $project: { _id: 1 } },
      ],
      as: "myLike",
    },
  },
  {
    $set: {
      likedByMe: { $gt: [{ $size: "$myLike" }, 0] },
    },
  },
];
