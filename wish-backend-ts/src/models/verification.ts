import { ObjectId } from "mongodb";
import { getDb } from "../databases/db/mongo";

export type VerificationStatus = "pending" | "approved" | "rejected";

export type VerificationRecord = {
  _id?: ObjectId;
  uid: string;
  email: string;
  status: VerificationStatus;
  challengeId: string;
  selfieKey?: string;
  photoKey: string;
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  rejectReason?: string;
};

const verifications = () =>
  getDb().collection<VerificationRecord>("verifications");
const users = () => getDb().collection("users");

export const getUserVerificationState = async (uid: string) => {
  const user = await users().findOne(
    { uid },
    { projection: { images: 1, verified: 1 } }
  );
  const profileImage = (user?.images ?? []).find((image: any) => image.isProfile);
  return {
    verified: user?.verified === true,
    profilePhotoKey: profileImage?.key as string | undefined,
  };
};

export const createPending = async (
  record: Omit<VerificationRecord, "_id" | "status" | "createdAt"> & {
    selfieKey: string;
  }
) => {
  const result = await verifications().insertOne({
    ...record,
    status: "pending",
    createdAt: new Date(),
  });
  return result.insertedId;
};

export const getLatestForUser = async (uid: string) => {
  return verifications().findOne({ uid }, { sort: { createdAt: -1 } });
};

export const countSubmissionsSince = async (uid: string, since: Date) => {
  return verifications().countDocuments({ uid, createdAt: { $gte: since } });
};

export const listPending = async (limit = 50) => {
  return verifications()
    .find({ status: "pending" })
    .sort({ createdAt: 1 })
    .limit(limit)
    .toArray();
};

export const getPendingById = async (id: string) => {
  return verifications().findOne({
    _id: new ObjectId(id),
    status: "pending",
  });
};

export const approve = async (record: VerificationRecord, reviewer: string) => {
  const now = new Date();
  await verifications().updateOne(
    { _id: record._id, status: "pending" },
    {
      $set: { status: "approved", reviewedAt: now, reviewedBy: reviewer },
      $unset: { selfieKey: "" },
    }
  );

  // The photo may have changed while the review was queued.
  const user = await users().findOne(
    { uid: record.uid, images: { $elemMatch: { key: record.photoKey, isProfile: true } } },
    { projection: { _id: 1 } }
  );
  if (!user) {
    return false;
  }

  await users().updateOne(
    { _id: user._id },
    {
      $set: {
        verified: true,
        verifiedAt: now,
        verifiedPhotoKey: record.photoKey,
      },
    }
  );
  return true;
};

export const reject = async (
  record: VerificationRecord,
  reviewer: string,
  reason: string
) => {
  await verifications().updateOne(
    { _id: record._id, status: "pending" },
    {
      $set: {
        status: "rejected",
        reviewedAt: new Date(),
        reviewedBy: reviewer,
        rejectReason: reason,
      },
      $unset: { selfieKey: "" },
    }
  );
};

// Verification belongs to one specific main photo; drop it once that photo
// stops being the profile picture.
export const revokeIfPhotoChanged = async (uid: string) => {
  const user = await users().findOne(
    { uid, verified: true },
    { projection: { images: 1, verifiedPhotoKey: 1 } }
  );
  if (!user) {
    return;
  }

  const profileImage = (user.images ?? []).find((image: any) => image.isProfile);
  if (profileImage?.key === user.verifiedPhotoKey) {
    return;
  }

  await users().updateOne(
    { _id: user._id },
    { $set: { verified: false }, $unset: { verifiedAt: "", verifiedPhotoKey: "" } }
  );
};