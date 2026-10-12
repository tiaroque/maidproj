
import { Collection } from 'mongodb';
import { getDb } from './mongo';

const ensureUniqueUidIndex = async (collection: Collection) => {
  const indexes = await collection.listIndexes().toArray();
  const existing = indexes.find((index) => index.name === 'uid_1');
  if (existing && !existing.unique) {
    await collection.dropIndex('uid_1');
  }

  try {
    await collection.createIndex(
      { uid: 1 },
      { unique: true, partialFilterExpression: { uid: { $type: 'string' } } }
    );
  } catch (error) {
    // Duplicate uids block the unique index; fall back so lookups stay indexed.
    console.error('Unique uid index failed, check for duplicate uids:', error);
    await collection.createIndex({ uid: 1 });
  }
};

export const manageIndexes = async () => {
  let collection = getDb().collection('users');
  try {
    // const result = await collection.listIndexes().toArray();

    // if (!result.some(index => index.name.includes('email'))) {
      collection.createIndex({ email: 1 }, { unique: true })
    // }
    await ensureUniqueUidIndex(collection);

    collection.createIndex({ "offers.offer": "text" }, { default_language: "portuguese" })
    collection.createIndex({ canonicalEmail: 1 });

    const userDevices = getDb().collection("user_devices");
    userDevices.createIndex({ uid: 1, deviceId: 1 }, { unique: true });
    userDevices.createIndex({ deviceId: 1 });
    userDevices.createIndex({ fingerprints: 1 });
    userDevices.createIndex({ ipHashes: 1 });

    const multiAccountReviews = getDb().collection("multi_account_reviews");
    multiAccountReviews.createIndex({ signal: 1, key: 1 }, { unique: true });

    // Search: role first, then the place filters (home or covered area).
    collection.createIndex({ userType: 1, country: 1, location: 1 })
    collection.createIndex({ userType: 1, "areasCovered.country": 1, "areasCovered.location": 1 })
    collection.createIndex({ userType: 1, services: 1 })

    const challenges = getDb().collection("webauthn_challenges");
    challenges.createIndex({ challengeId: 1 }, { unique: true });
    challenges.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    const passkeys = getDb().collection("passkeys");
    passkeys.createIndex({ credentialId: 1 }, { unique: true });
    passkeys.createIndex({ uid: 1 });

    const profileLikes = getDb().collection("profile_likes");
    profileLikes.createIndex({ likerUid: 1, likedUid: 1 }, { unique: true });
    profileLikes.createIndex({ likedUid: 1, createdAt: -1 });
    profileLikes.createIndex({ likerUid: 1, createdAt: -1 });

    const profileVisits = getDb().collection("profile_visits");
    profileVisits.createIndex(
      { visitorUid: 1, visitedUid: 1 },
      { unique: true }
    );
    profileVisits.createIndex({ visitedUid: 1, lastVisitedAt: -1 });

    const conversations = getDb().collection("conversations");
    conversations.createIndex({ participants: 1 });

    const messages = getDb().collection("messages");
    messages.createIndex({ "message.key": 1 }, { sparse: true });
    messages.createIndex({ "message.keyRezised": 1 }, { sparse: true });

    const verifications = getDb().collection("verifications");
    verifications.createIndex({ status: 1, createdAt: 1 });
    verifications.createIndex({ uid: 1, createdAt: -1 });
  }
  catch(error) {
    console.log("Mongo clearing index error")
  }
   
}   
  
