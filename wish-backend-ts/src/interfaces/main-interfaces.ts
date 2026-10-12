import { ObjectId } from "mongodb";

export interface Conversation {
  _id: ObjectId;
  meUserId?: string;
  creationDate: Date;
  participants: string[];
  participantsEmail: string[];
  updateDate: Date;
  users: {
    [user: string]: string;
  };
  lastMsg: {
    sender: string;
    senderEmail: string;
    message: string;
    type: string;
    updateDate: Date;
  };
  // Unread messages per receiver uid. `unreadCount` is the legacy shared
  // counter; API responses overwrite it with the requesting user's count.
  unread?: Record<string, number>;
  unreadCount: number;
  alertsDisabled: string[];
  favoritedBy?: string[];
}

export interface UserTo {
  claims: Claims;
  emailVerified: boolean;
  lastname: any;
  name: string;
  phoneNumber: any;
  uid: string;
  userType: string;
  offers: Offer[];
  images?: Image[];
  updateDate?: string;
}

export interface Claims {
  user: string;
}

export interface Offer {
  offer: string;
  date: string;
}

export interface Image {
  key: string;
  location: string;
  isProfile: boolean;
}

export interface ChatMessageDTO {
  _id: ObjectId;
  conversationId: string;
  date: string;
  message?: string;
  image?: ImageInfo;
  type: "message" | "media";
  sender: string;
  receiver: string;
}

export interface ChatDTO {
  messages: ChatMessageDTO[];
  count: number;
}

export interface ImageInfo {
  _id?: string;
  userId?: string;
  key: string;
  keyRezised: string;
  keyBlured?: string;
  mimetype: string;
  width: number;
  height: number;
  thumbWidth: number;
  thumbHeight: number;
  contentType?: string;
  originalname?: string;
  bucket?: string;
  size?: number;
  isProfile?: boolean;
  etag?: string;
  date?: Date;
}
