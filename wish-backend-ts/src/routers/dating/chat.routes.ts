import { Request, Router } from "express";
import { ObjectId } from "mongodb";
import { auth } from "../../middleware/auth";
import {
  createInbox,
  validadeConversation,
  getConversationFull,
  getInbox,
  getMessagesByConversationId,
  getMessagesByConversationIdCount,
  getInboxCount,
  resetConversation,
  addMeToDisableAlerts,
  removeFromDisableAlerts,
  addMeToFavorites,
  removeFromFavorites,
  getFavoriteConversations,
  getConversationForParticipant,
  getChatMediaForDeletion,
  markChatMediaDeleted,
  InboxCursor,
} from "../../models/dating/chat";
import {
  getOldestDateMessage,
  sleep,
} from "../../services/utils.service";
import { ChatDTO } from "../../interfaces/main-interfaces";
import { getUserByUid } from "../../models/user";
import { validateGenderExists } from "../../middleware/validate-gender";
import config from "../../endpoints.config";
import { deleteObject } from "../../services/file-upload";
import { notifyMediaDeleted } from "../../sockets/socketio";

const router = Router();

// router.get('/getUserTo', auth, async (req, res, next) => {
//   try {
//     let userIdTo = req.query.userToUid as string;

//     // Get user from the DB
//     let user = await getUserByUid(userIdTo);

//     if (!user) {
//       return res.status(404).send();
//     }

//     return res.status(200).send(user);
//   }
//   catch (error) {
//     next(error);
//   }
// })

router.post(
  "/createInbox",
  auth,
  validateGenderExists,
  async (req, res, next) => {
    try {
      // const errors = validationResult(req);
      // if (!errors.isEmpty()) {
      //     return res.status(400).json({ errors: errors.array() });
      // }

      console.time("dbsave");

      let userMeId = req.uid;
      let userMeEmail = req.email;
      // let userNameGoogle = req.name;

      const body = req.body;
      let userIdTo = body.userIdTo;

      // const userToRecord: UserRecord = await admin.auth().getUser(userIdTo);

      // if (!userToRecord.email) {
      //   return res.status(400).send({
      //     error: "User has no email defined",
      //   });
      // }

      let user = await getUserByUid(userIdTo);
      let conversationId = await createInbox(
        userMeId,
        userIdTo,
        userMeEmail,
        user.user.email
      );

      // if (result.insertedCount !== 1) {
      //     return res.status(400).send(null);
      // }
      console.timeEnd("dbsave");
      return res.status(201).send({
        conversationId: conversationId,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/resetUnread",
  auth,
  validateGenderExists,
  async (req, res, next) => {
    try {
      // const errors = validationResult(req);
      // if (!errors.isEmpty()) {
      //     return res.status(400).json({ errors: errors.array() });
      // }

      const body = req.body;
      let conversationId = body.conversationId;

      const reset = await resetConversation(conversationId, req.uid);
      if (!reset) {
        return res.status(404).send({ error: "No conversation found" });
      }

      return res.status(201).send({
        conversationId: conversationId,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/addMeToDisableAlerts",
  auth,
  validateGenderExists,
  async (req, res, next) => {
    try {
      // const errors = validationResult(req);
      // if (!errors.isEmpty()) {
      //     return res.status(400).json({ errors: errors.array() });
      // }

      const body = req.body;
      let conversationId = body.conversationId;

      let userMeId = req.uid;

      if (typeof conversationId !== "string" || !ObjectId.isValid(conversationId)) {
        return res.status(400).send({ error: "Invalid conversationId" });
      }

      const result = await addMeToDisableAlerts(userMeId, conversationId);
      if (result.matchedCount === 0) {
        return res.status(404).send({ error: "No conversation found" });
      }

      return res.status(201).send({
        conversationId: conversationId,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/removeFromDisableAlerts",
  auth,
  validateGenderExists,
  async (req, res, next) => {
    try {
      // const errors = validationResult(req);
      // if (!errors.isEmpty()) {
      //     return res.status(400).json({ errors: errors.array() });
      // }

      const body = req.body;
      let conversationId = body.conversationId;

      let userMeId = req.uid;

      if (typeof conversationId !== "string" || !ObjectId.isValid(conversationId)) {
        return res.status(400).send({ error: "Invalid conversationId" });
      }

      const result = await removeFromDisableAlerts(userMeId, conversationId);
      if (result.matchedCount === 0) {
        return res.status(404).send({ error: "No conversation found" });
      }

      return res.status(201).send({
        conversationId: conversationId,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Gets conversation and validates the two peers of this conversation
router.get(
  "/validadeConversation",
  auth,
  validateGenderExists,
  async (req, res, next) => {
    try {
      let userMeId = req.uid;

      let userIdTo = req.query.userToUid as string;

      // const userToRecord: UserRecord = await admin.auth().getUser(userIdTo);
      // if (!userToRecord.email) {
      //   return res.status(400).send({
      //     error: "User has no email defined",
      //   });
      // }

      let conversation = await validadeConversation(userMeId, userIdTo);

      // if(conversation) {
      //     await resetUnreadNotifications(conversation._id, usedIdGoogle)
      // }

      if (!conversation) {
        return res.status(400).send({ error: "No conversation found" });
      }

      return res.status(201).send({
        ...conversation,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/getConversationFull",
  auth,
  validateGenderExists,
  async (req, res, next) => {
    try {
      let userMeId = req.uid;

      let userIdTo = req.query.userToUid as string;
      // const userToRecord: UserRecord = await admin.auth().getUser(userIdTo);
      // if (!userToRecord.email) {
      //   return res.status(400).send({
      //     error: "User has no email defined",
      //   });
      // }

      let conversation = await getConversationFull(userMeId, userIdTo);

      return res.status(200).send(conversation);
    } catch (error) {
      next(error);
    }
  }
);

// Get the past messages of a conversation
router.get(
  "/getMessages",
  auth,
  validateGenderExists,
  async (req, res, next) => {
    try {
      let userMeUid = req.uid;
      let conversationId = req.query.conversationId as string;

      const query = req.query;
      let lastDate = query.lastDate as string;
      let pageSize = query.pageSize as string;

      let list = await getMessagesByConversationId(
        userMeUid,
        conversationId,
        lastDate,
        pageSize
      );

      let chatDTO: ChatDTO;

      if (list.length === 0) {
        chatDTO = {
          messages: list,
          count: 0,
        };
        // await sleep(5000);
        return res.status(200).send(chatDTO);
      }

      const oldestDateMessage = getOldestDateMessage(list);

      let count = await getMessagesByConversationIdCount(
        conversationId,
        oldestDateMessage
      );

      chatDTO = {
        messages: list,
        count,
      };

      // await sleep(2000);
      // return res.status(500).send(chatDTO);
      return res.status(200).send(chatDTO);
    } catch (error) {
      next(error);
    }
  }
);

// Get the past messages of a conversation
router.get(
  "/getMessagesCount",
  auth,
  validateGenderExists,
  async (req, res, next) => {
    try {
      let userMeId = req.uid;
      let conversationId = req.query.conversationId as string;

      const query = req.query;
      let lastDate = query.lastDate as string;

      const conversation = await getConversationForParticipant(
        conversationId,
        userMeId,
      );
      if (!conversation) {
        return res.status(404).send({ error: "No conversation found" });
      }

      let count = await getMessagesByConversationIdCount(
        conversationId,
        lastDate
      );

      return res.status(200).send({ count });
    } catch (error) {
      next(error);
    }
  }
);

//Get the list of message chat users
router.get(
  "/favorites",
  auth,
  validateGenderExists,
  async (req, res, next) => {
    try {
      let userMeId = req.uid;
      const conversations = await getFavoriteConversations(userMeId);
      return res.status(200).send(conversations);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/addFavorite",
  auth,
  validateGenderExists,
  async (req, res, next) => {
    try {
      const body = req.body;
      let conversationId = body.conversationId;
      let userMeId = req.uid;

      const result = await addMeToFavorites(userMeId, conversationId);
      if (result.matchedCount === 0) {
        return res.status(404).send({ error: "No conversation found" });
      }

      return res.status(201).send({
        conversationId: conversationId,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/removeFavorite",
  auth,
  validateGenderExists,
  async (req, res, next) => {
    try {
      const body = req.body;
      let conversationId = body.conversationId;
      let userMeId = req.uid;

      const result = await removeFromFavorites(userMeId, conversationId);
      if (result.matchedCount === 0) {
        return res.status(404).send({ error: "No conversation found" });
      }

      return res.status(201).send({
        conversationId: conversationId,
      });
    } catch (error) {
      next(error);
    }
  },
);

// No lastDate means the first page. The client clock is never used as the
// starting point, because a client running behind the server would hide its
// most recent conversations.
const parseInboxCursor = (query: Request["query"]) => {
  const lastDate = query.lastDate;
  if (lastDate === undefined) {
    return { cursor: undefined };
  }
  const date = new Date(lastDate as string);
  if (typeof lastDate !== "string" || isNaN(date.getTime())) {
    return { error: "Invalid lastDate" };
  }
  const lastId = query.lastId;
  if (lastId === undefined) {
    return { cursor: { date } as InboxCursor };
  }
  if (typeof lastId !== "string" || !ObjectId.isValid(lastId)) {
    return { error: "Invalid lastId" };
  }
  return { cursor: { date, id: new ObjectId(lastId) } as InboxCursor };
};

router.get("/inbox", auth, validateGenderExists, async (req, res, next) => {
  try {
    const { cursor, error } = parseInboxCursor(req.query);
    if (error) {
      return res.status(400).send({ message: error });
    }
    let userMeId = req.uid;

    const conversations = await getInbox(userMeId, cursor);

    if (conversations.length === 0) {
      return res.status(200).send({ conversations, count: 0 });
    }

    const oldest = conversations[conversations.length - 1];
    let countList = await getInboxCount(userMeId, {
      date: oldest.updateDate,
      id: oldest._id,
    });

    if (countList.length === 0) {
      return res.status(200).send({ conversations, count: 0 });
    }
    let count = countList[0].count;
    return res.status(200).send({ conversations, count });
  } catch (error) {
    next(error);
  }
});

router.get("/test", async (req, res) => {
  setTimeout(() => {
    res.send({ test: "true" });
  }, 0);
});

router.get(
  "/getInboxCount",
  auth,
  validateGenderExists,
  async (req, res, next) => {
    try {
      const { cursor, error } = parseInboxCursor(req.query);
      if (error) {
        return res.status(400).send({ message: error });
      }
      let userMeId = req.uid;
      let countList = await getInboxCount(userMeId, cursor);
      if (countList.length === 0) {
        return res.status(200).send({ count: 0 });
      }
      let count = countList[0].count;
      return res.status(200).send({ count });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/media/:messageId",
  auth,
  validateGenderExists,
  async (req, res, next) => {
    try {
      const result = await getChatMediaForDeletion(
        req.params.messageId,
        req.uid,
      );
      if (!result) {
        return res.status(404).send();
      }

      if (result.keys.length > 0) {
        const removed = await deleteObject(
          config.AWSBucketName,
          result.keys.map((Key) => ({ Key })),
        );
        if (!removed) {
          return res.status(500).send({ message: "pleaseTryLater" });
        }
      }

      if (!result.alreadyDeleted) {
        await markChatMediaDeleted(
          result.messageId,
          req.uid,
          result.isLastMessage,
        );
      }

      notifyMediaDeleted([req.uid, result.receiver], {
        conversationId: result.conversationId,
        messageId: result.messageId,
        isLastMessage: result.isLastMessage,
      });

      return res.status(200).send({
        conversationId: result.conversationId,
        messageId: result.messageId,
        isLastMessage: result.isLastMessage,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
