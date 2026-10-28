import { getDb } from "../databases/db/mongo";
import { FindOneAndUpdateOptions } from "mongodb";
import { canonicalEmail } from "../services/device-tracking.service";

export interface UserInfoCreation {
  name: string;
  lastname: string;
  email: string;
  password?: string;
  uid: string;
  emailVerified: boolean;
  lang?: string;
  phoneNumber?: string;
  images: any[];
  additionalUserInfo: any;
  claims?: any;
  userType?: string;
  deleted: boolean;
}

// Fields that must never be sent to another user or an anonymous visitor.
const CREDENTIAL_FIELDS = [
  "password",
  "emailVerifyToken",
  "emailVerifyExpires",
  "passwordResetToken",
  "passwordResetExpires",
  "verifiedPhotoKey",
];

// Anonymous endpoints additionally drop contact and identity data.
const PUBLIC_HIDDEN_FIELDS = [
  ...CREDENTIAL_FIELDS,
  "email",
  "canonicalEmail",
  "emailVerified",
  "phoneNumber",
  "lastname",
  "birthDate",
  "birthDateStr",
  "claims",
  "isFake",
  "additionalUserInfo",
  "blocked",
  "pushPrefs",
];

const excludeUserFields = (fields: string[]) =>
  Object.fromEntries(fields.map((field) => [`user.${field}`, 0]));

// Other members see the same fields as anonymous visitors (but unblurred photos).
export const otherUserProjection = excludeUserFields(PUBLIC_HIDDEN_FIELDS);
export const publicUserProjection = excludeUserFields(PUBLIC_HIDDEN_FIELDS);

// Same list for pipelines that hold the user document at the root.
export const publicRootProjection = Object.fromEntries(
  PUBLIC_HIDDEN_FIELDS.map((field) => [field, 0])
);

export const createUser = async (
  user: Partial<UserInfoCreation>
) => {
  let collection = getDb().collection("users");

  const options: FindOneAndUpdateOptions = {
    upsert: true,
    returnDocument: "after",
  };

  const query = {
    email: user.email,
  };

  let dateNow = new Date(new Date().toISOString());

  // Default
  const update = {
    $setOnInsert: {
      creationDate: dateNow,
    },
    $set: user.email
      ? { ...user, canonicalEmail: canonicalEmail(user.email) }
      : user,
  };

  return collection.findOneAndUpdate(query, update, options);
};

export const createSignup = async (uid: string, profile: any) => {
  let collection = getDb().collection("users");
  // const userType = user.claims.user;
  // const claims = {
  //   user: user.claims.user,
  // };

  const query = {
    uid,
  };

  const update = {
    $set: {
      ...profile,
    },
  };

  const result = await collection.updateOne(query, update);

  return result.matchedCount === 1;
};

const getUser = async (match: { email: string } | { uid: string }): Promise<any> => {
  let collection = getDb().collection("users");

  const users = await collection
    .aggregate([
      { $match: match },
      {
        $project: {
          user: "$$ROOT",
        },
      },
      // {
      //   $lookup: {
      //     from: "images",
      //     let: {
      //       uid: "$user.uid",
      //     },
      //     pipeline: [
      //       {
      //         $match: {
      //           $expr: {
      //             $and: [
      //               { $eq: ["$userId", "$$uid"] },
      //               { $eq: ["$isProfile", true] },
      //             ],
      //           },
      //         },
      //       },
      //     ],
      //     as: "photo",
      //   },
      // },

      // {
      //   $set: {
      //     photo: {
      //       $first: "$photo",
      //     },
      //   },
      // },

      { $project: { "user.additionalUserInfo": 0 } },
    ])
    .toArray();

  // const user = await collection.findOne({ email });

  return users[0];
};

export const getUserByEmail = (email: string) => getUser({ email });

export const getUserByUid = (uid: string) => getUser({ uid });

export const canonicalEmailTaken = async (email: string) =>
  (await getDb()
    .collection("users")
    .countDocuments(
      { canonicalEmail: canonicalEmail(email) },
      { limit: 1 }
    )) > 0;

export const countRegisteredUsers = () =>
  getDb()
    .collection("users")
    .countDocuments({ deleted: { $ne: true }, isFake: { $ne: true } });

export const getDetailsForUserByUid = async (uid: string): Promise<any> => {
  let collection = getDb().collection("users");

  let match = { uid: uid };

  const users = await collection
    .aggregate([
      { $match: match },
      {
        $project: {
          user: "$$ROOT",
        },
      },

      { $project: otherUserProjection },
    ])
    .toArray();

  return users[0];
};

export const getDetailsForUserByUidHome = async (uid: string): Promise<any> => {
  let collection = getDb().collection("users");

  let match = { uid: uid };

  const users = await collection
    .aggregate([
      { $match: { ...match, deleted: { $ne: true } } },
      {
        $set: {
          images: {
            $map: {
              input: "$images",
              as: "image", // creating the variable alias
              in: {
                keyBlured: "$$image.keyBlured",
                isProfile: "$$image.isProfile",
                width: "$$image.width",
                height: "$$image.height",
                thumbWidth: "$$image.thumbWidth",
                thumbHeight: "$$image.thumbHeight",
              },
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
    ])
    .toArray();

  return users[0];
};

export const setEmailVerification = async (
  email: string,
  tokenHash: string,
  expires: Date
) => {
  await getDb()
    .collection("users")
    .updateOne(
      { email },
      {
        $set: {
          emailVerifyToken: tokenHash,
          emailVerifyExpires: expires,
        },
      }
    );
};

export const getUserByEmailVerifyToken = async (tokenHash: string) => {
  return getDb().collection("users").findOne({
    emailVerifyToken: tokenHash,
  });
};

export const confirmEmailVerification = async (email: string) => {
  await getDb()
    .collection("users")
    .updateOne(
      { email },
      {
        $set: { emailVerified: true },      }
    );
};

export const setPasswordReset = async (
  email: string,
  tokenHash: string,
  expires: Date
) => {
  await getDb()
    .collection("users")
    .updateOne(
      { email },
      {
        $set: {
          passwordResetToken: tokenHash,
          passwordResetExpires: expires,
        },
      }
    );
};

export const getUserByResetToken = async (tokenHash: string) => {
  return getDb()
    .collection("users")
    .findOne({
      passwordResetToken: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    });
};

export const setUserPassword = async (email: string, passwordHashed: string) => {
  await getDb()
    .collection("users")
    .updateOne(
      { email },
      {
        $set: { password: passwordHashed },
        $unset: { passwordResetToken: "", passwordResetExpires: "" },
      }
    );
};

export const setChatAlertsDisabled = async (uid: string, disabled: boolean) => {
  const result = await getDb()
    .collection("users")
    .updateOne({ uid }, { $set: { chatAlertsDisabled: disabled } });
  return result.matchedCount === 1;
};

export type PushKind = "chat" | "likes" | "visits";

export type PushPrefs = Record<PushKind, boolean>;

export const defaultPushPrefs: PushPrefs = {
  chat: true,
  likes: true,
  visits: true,
};

export const getPushPrefs = async (uid: string): Promise<PushPrefs> => {
  const doc = await getDb()
    .collection("users")
    .findOne({ uid }, { projection: { _id: 0, pushPrefs: 1 } });
  return { ...defaultPushPrefs, ...(doc?.pushPrefs ?? {}) };
};

export const setPushPrefs = async (uid: string, prefs: Partial<PushPrefs>) => {
  const update = Object.fromEntries(
    Object.entries(prefs).map(([kind, enabled]) => [`pushPrefs.${kind}`, enabled])
  );
  const result = await getDb()
    .collection("users")
    .updateOne({ uid }, { $set: update });
  return result.matchedCount === 1;
};

export const markUserDeleted = async (uid: string) => {
  const result = await getDb()
    .collection("users")
    .updateOne(
      { uid },
      {
        $set: { deleted: true, deletedAt: new Date() },
        $unset: {
          emailVerifyToken: "",
          emailVerifyExpires: "",
          passwordResetToken: "",
          passwordResetExpires: "",
        },
      }
    );
  return result.matchedCount === 1;
};

export const markUserRemovedByModerator = async (
  uid: string,
  moderator: string,
  reason: string
) => {
  const result = await getDb()
    .collection("users")
    .updateOne(
      { uid, deleted: { $ne: true } },
      {
        $set: {
          deleted: true,
          deletedAt: new Date(),
          removedByModerator: true,
          removedBy: moderator,
          removedReason: reason,
        },
        $unset: {
          emailVerifyToken: "",
          emailVerifyExpires: "",
          passwordResetToken: "",
          passwordResetExpires: "",
        },
      }
    );
  return result.modifiedCount === 1;
};

export const blockUser = async (userMeUid: string, userToBlockUid: string) => {
  let collection = getDb().collection("users");

  const querySearchMe = {
    uid: userMeUid,
  };

  const update = {
    $addToSet: {
      blocked: userToBlockUid,
    },
  };

  const options = { upsert: false };

  let inserts = await collection.updateOne(querySearchMe, update, options);

  return inserts;
};

export const unblockUser = async (
  userMeUid: string,
  userToUnblockUid: string
) => {
  let collection = getDb().collection("users");

  const querySearchMe = {
    uid: userMeUid,
  };

  const update = {
    $pull: { blocked: userToUnblockUid },
  } as any;

  const options = { upsert: false };

  let inserts = await collection.updateOne(querySearchMe, update, options);

  return inserts;
};

export const getBlockedUsers = async (uid: string) => {
  let collection = getDb().collection("users");
  return collection
    .aggregate([
      { $match: { uid } },
      { $project: { _id: 0, blocked: 1 } },
      { $unwind: "$blocked" },
      {
        $lookup: {
          from: "users",
          let: {
            blocked: "$blocked",
          },
          pipeline: [
            { $match: { $expr: { $eq: ["$uid", "$$blocked"] } } },
            { $project: { _id: 0, ...publicRootProjection, offers: 0 } },
            {
              $set: {
                profileImage: {
                  $first: {
                    $filter: {
                      input: "$images",
                      as: "image",
                      cond: { $eq: ["$$image.isProfile", true] },
                    },
                  },
                },
              },
            },
          ],
          as: "blockedUser",
        },
      },
      {
        $set: {
          blockedUser: {
            $first: "$blockedUser",
          },
        },
      },
      {
        $project: {
          blocked: 0,
        },
      },
    ])
    .toArray();
};
