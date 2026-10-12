import { getDb } from "../databases/db/mongo";

export type PasskeyCeremony = "registration" | "authentication";

export type StoredPasskey = {
  credentialId: string;
  uid: string;
  publicKey: string;
  counter: number;
  transports: string[];
  deviceType: "singleDevice" | "multiDevice";
  backedUp: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
};

const challenges = () => getDb().collection("webauthn_challenges");
const passkeys = () => getDb().collection<StoredPasskey>("passkeys");

const challengeTtlMs = 5 * 60 * 1000;

export const saveChallenge = async (
  challengeId: string,
  challenge: string,
  type: PasskeyCeremony,
  uid?: string
) => {
  await challenges().insertOne({
    challengeId,
    challenge,
    type,
    uid,
    expiresAt: new Date(Date.now() + challengeTtlMs),
  });
};

export const consumeChallenge = async (
  challengeId: string,
  type: PasskeyCeremony,
  uid?: string
) => {
  const query: Record<string, unknown> = {
    challengeId,
    type,
    expiresAt: { $gt: new Date() },
  };
  if (uid) {
    query.uid = uid;
  }
  return challenges().findOneAndDelete(query);
};

export const listPasskeys = async (uid: string) => {
  return passkeys()
    .find(
      { uid },
      {
        projection: {
          _id: 0,
          credentialId: 1,
          createdAt: 1,
          lastUsedAt: 1,
          deviceType: 1,
          backedUp: 1,
        },
      }
    )
    .sort({ createdAt: -1 })
    .toArray();
};

export const countPasskeys = async (uid: string) => {
  return passkeys().countDocuments({ uid });
};

export const getPasskey = async (credentialId: string) => {
  return passkeys().findOne({ credentialId });
};

export const insertPasskey = async (passkey: StoredPasskey) => {
  await passkeys().insertOne(passkey);
};

export const updatePasskeyUse = async (
  credentialId: string,
  counter: number,
  deviceType: StoredPasskey["deviceType"],
  backedUp: boolean
) => {
  await passkeys().updateOne(
    { credentialId },
    {
      $set: {
        counter,
        deviceType,
        backedUp,
        lastUsedAt: new Date(),
      },
    }
  );
};

export const deleteAllPasskeys = async (uid: string) => {
  await passkeys().deleteMany({ uid });
};

export const deletePasskey = async (uid: string, credentialId: string) => {
  const result = await passkeys().deleteOne({ uid, credentialId });
  return result.deletedCount === 1;
};
