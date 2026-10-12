import { Filter, ObjectId, UpdateFilter } from "mongodb";

// import * as debounce from 'debounce-promise'
import { getDb } from "../../databases/db/mongo";
import {
  ChatMessageDTO,
  Conversation,
  ImageInfo,
} from "../../interfaces/main-interfaces";
import { lookupFromUser } from "./pipeline-queries-helper";

export interface ChatMessageEntity {
  _id: ObjectId;
  conversationId: ObjectId;
  date: Date;
  message?: string;
  image?: ImageInfo;
  type: "message" | "media";
  sender: string;
  receiver: string;
  senderEmail: string;
  receiverEmail: string;
  deleted?: boolean;
}

// // index signature
// let messages: { [key: string]: any } = {};

export const saveIntoDb = async (
  chatMessage: ChatMessageDTO,
  senderEmail: string,
  receiverEmail: string,
): Promise<any> => {
  let collectionMessages = getDb().collection("messages");

  const messageId = new ObjectId(chatMessage._id);

  let entity: ChatMessageEntity = {
    _id: messageId,
    conversationId: new ObjectId(chatMessage.conversationId),
    date: new Date(chatMessage.date),
    message: chatMessage.message,
    type: chatMessage.type,
    sender: chatMessage.sender,
    receiver: chatMessage.receiver,
    senderEmail: senderEmail,
    receiverEmail: receiverEmail,
  };

  const query = {
    _id: messageId,
  };

  const update = {
    $set: entity,
  };

  const options = { upsert: true };

  await collectionMessages.updateOne(query, update, options);

  //todo: use insertmany the same as bulk inserts
};

// Conversations created before per-user counts only have the shared
// `unreadCount`, which belonged to whoever did not send the last message.
const unreadCountFor = (userId: string) => ({
  $ifNull: [
    `$unread.${userId}`,
    {
      $cond: [
        { $ne: ["$lastMsg.sender", userId] },
        { $ifNull: ["$unreadCount", 0] },
        0,
      ],
    },
  ],
});

// Users that share a conversation with userId and where neither side has
// blocked the other, optionally limited to candidateIds.
export const getConversationPartners = async (
  userId: string,
  candidateIds?: string[],
) => {
  const filter: Filter<Conversation> = candidateIds
    ? {
        $and: [
          { participants: userId },
          { participants: { $in: candidateIds } },
        ],
      }
    : { participants: userId };

  const conversations = await getDb()
    .collection<Conversation>("conversations")
    .find(filter)
    .project<Pick<Conversation, "participants">>({ _id: 0, participants: 1 })
    .toArray();

  const partners = new Set<string>();
  conversations.forEach((conversation) =>
    conversation.participants.forEach(
      (participant) => participant !== userId && partners.add(participant),
    ),
  );

  if (partners.size === 0) {
    return [];
  }

  const users = await getDb()
    .collection<{ uid: string; blocked?: string[] }>("users")
    .find({ uid: { $in: [userId, ...partners] } })
    .project<{ uid: string; blocked?: string[] }>({
      _id: 0,
      uid: 1,
      blocked: 1,
    })
    .toArray();

  const me = users.find((user) => user.uid === userId);
  const myBlocked = me?.blocked ?? [];

  return users
    .filter(
      (user) =>
        partners.has(user.uid) &&
        !myBlocked.includes(user.uid) &&
        !(user.blocked ?? []).includes(userId),
    )
    .map((user) => user.uid);
};

export const getConversationForParticipant = (
  conversationId: string,
  userId: string,
) => {
  if (typeof conversationId !== "string" || !ObjectId.isValid(conversationId)) {
    return Promise.resolve(null);
  }

  return getDb()
    .collection<Conversation>("conversations")
    .findOne({ _id: new ObjectId(conversationId), participants: userId });
};

// Get chat messages of a conversation
export const getMessagesByConversationId = async (
  userFromId: string,
  conversationId: string,
  lastDate: string,
  pageSize: string = "5",
) => {
  let collectionConversations = getDb().collection("conversations");

  let conversation = await collectionConversations.findOne<Conversation>({
    _id: new ObjectId(conversationId),
  });

  if (!conversation) {
    return [];
  }

  if (!conversation.participants.includes(userFromId)) {
    return [];
  }

  let collectionMessages = getDb().collection("messages");
  const ps = parseInt(pageSize);

  return collectionMessages
    .find({
      $and: [
        {
          conversationId: new ObjectId(conversationId),
        },
        {
          date: { $lt: new Date(lastDate) },
        },
      ],
    })
    .project<ChatMessageDTO>({ converstationId: 0 })
    .sort({ date: -1 })
    .limit(ps)
    .toArray();
};

export const getMessagesByConversationIdCount = async (
  conversationId: string,
  lastDate: string,
) => {
  let collectionMessages = getDb().collection("messages");

  return collectionMessages.countDocuments({
    $and: [
      {
        conversationId: new ObjectId(conversationId),
      },
      {
        date: { $lt: new Date(lastDate) },
      },
    ],
  });
};

// Gets conversation and validates the two peers of this conversation
export const validadeConversation = (userMeId: string, userToId: string) => {
  let collectionConversations = getDb().collection("conversations");

  const query = {
    participants: {
      $all: [
        { $elemMatch: { $eq: userMeId } },
        { $elemMatch: { $eq: userToId } },
      ],
    },
  };

  let dateNow = new Date(new Date().toISOString());

  const update = {
    $set: {
      updateDate: dateNow,
    },
  };

  return collectionConversations.findOneAndUpdate(query, update, {
    returnDocument: "after",
  });
  // return await collectionConversations.findOne(query)
};

export const getConversationFull = (
  userMeId: string,
  userToId: string,
) => {
  let collectionConversations = getDb().collection("conversations");

  return collectionConversations
    .aggregate<Conversation>([
      {
        $match: {
          participants: {
            $all: [
              { $elemMatch: { $eq: userMeId } },
              { $elemMatch: { $eq: userToId } },
            ],
          },
        },
      },
      { $unwind: "$participants" },
      { $match: { participants: { $ne: userMeId } } },
      ...lookupFromUser(userMeId),
      { $match: { userTo: { $exists: true } } },
      {
        $set: {
          meUserId: userMeId,
          unreadCount: unreadCountFor(userMeId),
        },
      },
    ])
    .toArray();
};

export const createInbox = async (
  userMeId: string,
  userToId: string,
  userMeEmail: string,
  userToEmail: string,
) => {
  let collectionConversations =
    getDb().collection<Conversation>("conversations");

  let dateNow = new Date(new Date().toISOString());

  // $elemMatch: {  } used when there are nested objects inside an array
  const query = {
    participants: {
      $all: [
        { $elemMatch: { $eq: userMeId } },
        { $elemMatch: { $eq: userToId } },
      ],
    },
  };

  const update: UpdateFilter<Conversation> = {
    $addToSet: {
      participants: { $each: [userMeId, userToId] },
      participantsEmail: { $each: [userMeEmail, userToEmail] },
    },
    $set: {
      updateDate: dateNow,
      users: {
        [userMeId]: userMeEmail,
        [userToId]: userToEmail,
      },
    },
    $setOnInsert: {
      creationDate: dateNow,
      unread: {},
    },
  };

  const conversation = await collectionConversations.findOneAndUpdate(
    query,
    update,
    { upsert: true, returnDocument: "after" },
  );

  return conversation?._id;
};

export const resetConversation = async (
  conversationId: string,
  userMeId: string,
) => {
  if (typeof conversationId !== "string" || !ObjectId.isValid(conversationId)) {
    return false;
  }

  let collectionConversations =
    getDb().collection<Conversation>("conversations");

  const query: Filter<Conversation> = {
    _id: new ObjectId(conversationId),
    participants: userMeId,
  };

  const update: UpdateFilter<Conversation> = {
    $set: {
      [`unread.${userMeId}`]: 0,
    },
  };

  const result = await collectionConversations.updateOne(query, update);

  return result.matchedCount > 0;
};

// Returns the receiver's unread count after the update.
export const updateConversation = async (
  message: ChatMessageDTO,
  senderEmail: string,
  incrementUnread: boolean,
): Promise<number> => {
  let conversationId = message.conversationId;
  let msg = message.message;
  let date = message.date;
  let type = message.type;

  let collectionConversations =
    getDb().collection<Conversation>("conversations");

  const query = {
    _id: new ObjectId(conversationId),
  };

  let dateNow = new Date(new Date().toISOString());

  const update: UpdateFilter<Conversation> = {
    $set: {
      updateDate: new Date(date),
      lastMsg: {
        sender: message.sender,
        senderEmail: senderEmail,
        message: msg as string,
        type: type,
        updateDate: dateNow,
      },
    },
    ...(incrementUnread && {
      $inc: { [`unread.${message.receiver}`]: 1 },
    }),
  };

  const conversation = await collectionConversations.findOneAndUpdate(
    query,
    update,
    { returnDocument: "after" },
  );

  return conversation?.unread?.[message.receiver] ?? 0;
};

export const addMeToDisableAlerts = async (
  userMeId: string,
  conversationId: string,
) => {
  let collection = getDb().collection<Conversation>("conversations");

  const querySearch: Filter<Conversation> = {
    _id: new ObjectId(conversationId),
    participants: userMeId,
  };

  const update = {
    $addToSet: {
      alertsDisabled: userMeId,
    },
  };

  const options = { upsert: false };

  let inserts = await collection.updateOne(querySearch, update, options);

  return inserts;
};

export const removeFromDisableAlerts = async (
  userMeId: string,
  conversationId: string,
) => {
  let collection = getDb().collection<Conversation>("conversations");

  const querySearch: Filter<Conversation> = {
    _id: new ObjectId(conversationId),
    participants: userMeId,
  };

  const update = {
    $pull: {
      alertsDisabled: userMeId,
    },
  };

  const options = { upsert: false };

  let inserts = await collection.updateOne(querySearch, update, options);

  return inserts;
};

export const addMeToFavorites = async (
  userMeId: string,
  conversationId: string,
) => {
  let collection = getDb().collection<Conversation>("conversations");

  const querySearch: Filter<Conversation> = {
    _id: new ObjectId(conversationId),
    participants: userMeId,
  };

  const update = {
    $addToSet: {
      favoritedBy: userMeId,
    },
  };

  return collection.updateOne(querySearch, update, { upsert: false });
};

export const removeFromFavorites = async (
  userMeId: string,
  conversationId: string,
) => {
  let collection = getDb().collection<Conversation>("conversations");

  const querySearch: Filter<Conversation> = {
    _id: new ObjectId(conversationId),
    participants: userMeId,
  };

  const update = {
    $pull: {
      favoritedBy: userMeId,
    },
  };

  return collection.updateOne(querySearch, update, { upsert: false });
};

export const getFavoriteConversations = async (
  userMeId: string,
) => {
  let collection = getDb().collection("conversations");

  return collection
    .aggregate<Conversation>([
      { $match: { participants: userMeId, favoritedBy: userMeId } },
      { $unwind: "$participants" },
      { $match: { participants: { $ne: userMeId } } },
      ...lookupFromUser(userMeId),
      { $match: { userTo: { $exists: true } } },
      {
        $set: {
          meUserId: userMeId,
          unreadCount: unreadCountFor(userMeId),
        },
      },
      { $sort: { updateDate: -1 } },
      { $limit: 200 },
    ])
    .toArray();
};

// Position of the last inbox item a client has seen. `id` breaks ties between
// conversations sharing an updateDate, so none are skipped at a page boundary.
export interface InboxCursor {
  date: Date;
  id?: ObjectId;
}

const olderThanCursor = (cursor?: InboxCursor) => {
  if (!cursor) {
    return [];
  }
  if (!cursor.id) {
    return [{ $match: { updateDate: { $lt: cursor.date } } }];
  }
  return [
    {
      $match: {
        $or: [
          { updateDate: { $lt: cursor.date } },
          { updateDate: cursor.date, _id: { $lt: cursor.id } },
        ],
      },
    },
  ];
};

// Get All the Users contacted, shows on the left side menu
export const getInbox = async (
  userMeId: string,
  cursor?: InboxCursor,
) => {
  let collection = getDb().collection("conversations");

  const items = await collection
    .aggregate<Conversation>([
      { $match: { participants: userMeId } },
      { $unwind: "$participants" },
      { $match: { participants: { $ne: userMeId } } },
      ...lookupFromUser(userMeId),
      { $match: { userTo: { $exists: true } } },
      {
        $set: {
          meUserId: userMeId,
          unreadCount: unreadCountFor(userMeId),
        },
      },

      ...olderThanCursor(cursor),

      { $sort: { updateDate: -1, _id: -1 } },

      { $limit: 25 },
    ])
    .toArray();

  return items;
};

export const getInboxCount = async (
  userMeId: string,
  cursor?: InboxCursor,
) => {
  let collection = getDb().collection("conversations");
  const countList = await collection
    .aggregate([
      { $match: { participants: userMeId } },
      { $unwind: "$participants" },
      { $match: { participants: { $ne: userMeId } } },
      ...lookupFromUser(userMeId),
      { $match: { userTo: { $exists: true } } },
      ...olderThanCursor(cursor),
      {
        $count: "count",
      },
    ])
    .toArray();

  return countList;
};

const chatMediaKeys = (message: unknown, userId: string) => {
  const image = (message as { message?: unknown }).message as
    | { key?: string; keyRezised?: string }
    | string
    | null;
  const storedKeys =
    image && typeof image === "object" ? [image.key, image.keyRezised] : [];

  return storedKeys.filter(
    (key): key is string =>
      typeof key === "string" &&
      (key.startsWith(`chat/${userId}/`) ||
        key.startsWith(`chat-resized/${userId}/`)),
  );
};

export const isChatMediaParticipant = async (key: string, userId: string) => {
  const message = await getDb()
    .collection("messages")
    .findOne(
      {
        $or: [{ "message.key": key }, { "message.keyRezised": key }],
        deleted: { $ne: true },
      },
      { projection: { sender: 1, receiver: 1 } },
    );

  return !!message && (message.sender === userId || message.receiver === userId);
};

// Only the sender can remove a photo. The message stays so the chat shows a
// placeholder. Files are deleted by the caller before markChatMediaDeleted.
export const getChatMediaForDeletion = async (
  messageId: string,
  userId: string,
) => {
  if (!ObjectId.isValid(messageId)) {
    return null;
  }

  const message = await getDb().collection("messages").findOne({
    _id: new ObjectId(messageId),
    sender: userId,
    type: "media",
  });

  if (!message) {
    return null;
  }

  const conversationId = message.conversationId as ObjectId;
  const newest = await getDb()
    .collection("messages")
    .find({ conversationId })
    .sort({ date: -1 })
    .limit(1)
    .next();

  return {
    conversationId: conversationId.toString(),
    messageId,
    receiver: message.receiver as string,
    isLastMessage: !!newest && newest._id.equals(message._id),
    alreadyDeleted: message.deleted === true,
    keys: message.deleted ? [] : chatMediaKeys(message, userId),
  };
};

export const markChatMediaDeleted = async (
  messageId: string,
  userId: string,
  isLastMessage: boolean,
) => {
  if (!ObjectId.isValid(messageId)) {
    return;
  }

  const messageObjectId = new ObjectId(messageId);
  const collection = getDb().collection("messages");
  const message = await collection.findOne({
    _id: messageObjectId,
    sender: userId,
    type: "media",
  });

  if (!message || message.deleted) {
    return;
  }

  await collection.updateOne(
    { _id: messageObjectId },
    { $set: { deleted: true }, $unset: { message: "" } },
  );

  if (isLastMessage) {
    await getDb()
      .collection("conversations")
      .updateOne(
        { _id: message.conversationId },
        {
          $set: {
            "lastMsg.message": "",
            "lastMsg.type": "media",
            "lastMsg.deleted": true,
          },
        },
      );
  }
};

export const deleteMessage = async (id: string) => {
  let collectionMessages = getDb().collection("messages");
  let result = await collectionMessages.deleteOne({ _id: new ObjectId(id) });
  return result;
};

// const lookupFromImages = {
//   $lookup: {
//     from: "images",
//     let: {
//       userId: "$userTo.uid",
//     },
//     pipeline: [
//       {
//         $match: {
//           $expr: {
//             $and: [
//               { $eq: ["$userId", "$$userId"] },
//               { $eq: ["$isProfile", true] },
//             ],
//           },
//         },
//       },
//     ],
//     as: "photo",
//   },
// };
