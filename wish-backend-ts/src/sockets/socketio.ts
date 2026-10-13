import { Server as ServerIO, Socket } from "socket.io";

import { Server } from "http";
import {
  getConversationForParticipant,
  getConversationPartners,
  saveIntoDb,
  updateConversation,
} from "../models/dating/chat";
import { ChatMessageDTO } from "../interfaces/main-interfaces";
import config from "../endpoints.config";
import { readSessionFromCookies } from "../auth/session";
import { flagLinks } from "../services/link-detection.service";

let io: ServerIO;

export const getSocketIO = () => io;

export interface MediaDeletedEvent {
  conversationId: string;
  messageId: string;
  isLastMessage: boolean;
}

export const notifyMediaDeleted = (
  participantIds: string[],
  event: MediaDeletedEvent,
) => {
  if (!io || participantIds.length === 0) {
    return;
  }

  io.to(participantIds.map(userRoom)).emit("mediaDeleted", event);
};

// Every socket of a user joins this room, so events meant for one user are
// only delivered to that user's tabs/devices.
const userRoom = (userId: string) => `user:${userId}`;

export const startSocketIO = (server: Server) => {
  try {
    io = new ServerIO({
      path: "/api/socket.io",
      transports: ["websocket"],
      cors: {
        origin: config.corsOrigins,
        credentials: true,
      },
    });

    io.attach(server);

    io.use((socket, next) => {
      try {
        const session = readSessionFromCookies(socket.request.headers.cookie);
        if (!session?.uid) {
          return next(new Error("unauthorized"));
        }

        socket.data.userId = session.uid;
        socket.data.email = session.email;
        next();
      } catch (err) {
        next(new Error("unauthorized"));
      }
    });
  } catch (err) {
    throw err;
  }

  return io;
};

export interface SocketUserData {
  userId: string;
  activeConversations: string[];
}

const getOnlineUsers = async (userIds: string[]) => {
  if (userIds.length === 0) {
    return [];
  }

  const sockets = await io.in(userIds.map(userRoom)).fetchSockets();
  const online = new Set(sockets.map((s) => s.data.userId as string));

  return userIds.filter((userId) => online.has(userId));
};

export const getAllOnlineUserIds = async (): Promise<string[]> => {
  if (!io) {
    return [];
  }

  const sockets = await io.fetchSockets();
  return [...new Set(sockets.map((s) => s.data.userId as string))];
};

const isUserOnline = async (userId: string) =>
  (await io.in(userRoom(userId)).fetchSockets()).length > 0;

// Presence is only shared with users that have a conversation with userId.
const notifyPartners = async (
  userId: string,
  event: "connected" | "disconnected",
) => {
  const partners = await getConversationPartners(userId);
  if (partners.length > 0) {
    io.to(partners.map(userRoom)).emit(event, userId);
  }
};

// Re-sends presence between two users after something changes whether they may
// see each other (block/unblock), so open tabs do not keep a stale status.
export const refreshPresenceBetween = async (
  userId: string,
  otherUserId: string,
) => {
  const [partners, userOnline, otherOnline] = await Promise.all([
    getConversationPartners(userId, [otherUserId]),
    isUserOnline(userId),
    isUserOnline(otherUserId),
  ]);
  const allowed = partners.includes(otherUserId);

  io.to(userRoom(otherUserId)).emit(
    allowed && userOnline ? "connected" : "disconnected",
    userId,
  );
  io.to(userRoom(userId)).emit(
    allowed && otherOnline ? "connected" : "disconnected",
    otherUserId,
  );
};

const isUserInRoom = async (conversationId: string, userId: string) => {
  const sockets = await io.in(conversationId).fetchSockets();
  return sockets.some((s) => s.data.userId === userId);
};

const handleIncomingMessage = async (
  socket: Socket,
  conversationId: string,
  message: ChatMessageDTO,
) => {
  const userId: string = socket.data.userId;

  const conversation = await getConversationForParticipant(
    conversationId,
    userId,
  );
  const receiver = conversation?.participants.find((p) => p !== userId);
  if (!conversation || !receiver) {
    return;
  }

  message.conversationId = conversationId;
  message.sender = userId;
  message.receiver = receiver;
  message.date = new Date().toISOString();

  const senderEmail = conversation.users?.[userId] ?? socket.data.email;
  const receiverEmail = conversation.users?.[receiver];

  await saveIntoDb(message, senderEmail, receiverEmail);
  flagLinks(userId, "chat", { message: message.message });

  io.to(conversationId).emit("message", message);

  const receiverIsViewing = await isUserInRoom(conversationId, receiver);
  const unreadCount = await updateConversation(
    message,
    senderEmail,
    !receiverIsViewing,
  );

  // Receiver tabs that are not showing this conversation still need to update
  // the inbox list and badge.
  io.to(userRoom(receiver))
    .except(conversationId)
    .emit(`${receiver}_message`, { ...message, unreadCount });
};

export const setSocketsConfiguration = () => {
  io.on("connection", (socket: Socket) => {
    const userId: string = socket.data.userId;

    // conversationId -> other participant, filled once membership is verified
    const joinedConversations = new Map<string, string>();
    // Lets a leaveRoom that arrives while joinRoom is still querying the DB win.
    const requestedRooms = new Set<string>();

    // Messages from one socket are processed in order so lastMsg and unread
    // counts are not written out of order.
    let messageQueue = Promise.resolve();
    const enqueueMessage = (conversationId: string, message: ChatMessageDTO) => {
      messageQueue = messageQueue
        .then(() => handleIncomingMessage(socket, conversationId, message))
        .catch((err) => console.error("Failed to handle chat message", err));
    };

    socket.join(userRoom(userId));
    notifyPartners(userId, "connected").catch((err) =>
      console.error("Failed to notify connection", err),
    );

    socket.on("disconnect", async () => {
      try {
        if (!(await isUserOnline(userId))) {
          await notifyPartners(userId, "disconnected");
        }
      } catch (err) {
        console.error("Failed to resolve disconnect state", err);
      }
    });

    socket.on(
      "getUsersConnectionState",
      async (userSocketData: SocketUserData) => {
        try {
          const requested = Array.isArray(userSocketData?.activeConversations)
            ? userSocketData.activeConversations.filter(
                (id): id is string => typeof id === "string",
              )
            : [];
          const partners =
            requested.length > 0
              ? await getConversationPartners(userId, requested)
              : [];
          const connectedUsers = await getOnlineUsers(partners);
          socket.emit(`${userId}_active_users`, connectedUsers);
        } catch (err) {
          console.error("Failed to get users connection state", err);
        }
      }
    );

    socket.on("joinRoom", async (conversationId: string) => {
      requestedRooms.add(conversationId);
      try {
        const conversation = await getConversationForParticipant(
          conversationId,
          userId,
        );
        const otherUser = conversation?.participants.find((p) => p !== userId);

        if (!otherUser || !requestedRooms.has(conversationId)) {
          return;
        }

        joinedConversations.set(conversationId, otherUser);
        socket.join(conversationId);
      } catch (err) {
        console.error("Failed to join room", err);
      }
    });

    socket.on("leaveRoom", (conversationId: string) => {
      requestedRooms.delete(conversationId);
      joinedConversations.delete(conversationId);
      socket.leave(conversationId);
    });

    socket.on("message", (conversationId: string, message: ChatMessageDTO) => {
      enqueueMessage(conversationId, message);
    });

    socket.on("media", (conversationId: string, message: ChatMessageDTO) => {
      enqueueMessage(conversationId, message);
    });

    socket.on(
      "typing",
      (_userToId: string, conversationId: string, isTyping: boolean) => {
        const userToId = joinedConversations.get(conversationId);
        if (!userToId) {
          return;
        }

        io.to(userRoom(userToId)).emit(`${userToId}_typing`, {
          conversationId,
          isTyping: !!isTyping,
        });
      }
    );
  });
};

export const getSocketIoConnection = () => io;
