import { ImageObj } from './user.interface';

export type groupType = 'start' | 'end';

export interface MessageDTO {
  _id: string;
  conversationId: string;
  date: string;
  message: string | ImageObj | null;
  sender: string;
  receiver: string;
  isSocketMessage: boolean;

  type: 'message' | 'media';
  loading: boolean | null;
  deleted?: boolean;

  groupType?: Array<groupType>;
  groupDaily?: string | null;

  // Set by the server on messages delivered outside the conversation room.
  unreadCount?: number;
}

export interface ChatDTO {
  messages: MessageDTO[];
  count: number;
}

export interface IsTyping {
  conversationId: string;
  isTyping: boolean;
}
