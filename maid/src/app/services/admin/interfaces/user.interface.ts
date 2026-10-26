import { Area, Availability, ServiceKey } from './service-catalog';

export type UserType = 'Cleaner' | 'Client';

// export interface UserObject {
//   _id: string;
//   age: number;
//   user: UserModel;
//   photo: Photo;
// }

export interface UserDetailsObject {
  _id: string;
  user: UserModel;
  likedByMe?: boolean;
  visitedByMe?: boolean;
  isOnline?: boolean;
}

export interface UserModel {
  _id?: string;
  uid: string;
  password?: string;
  name: string;
  emailVerified: boolean;
  email: string | null;
  profileName?: string;
  lastname?: string;
  birthDate?: string;
  birthDateStr?: string;
  country?: string;
  location?: string;
  locationName?: string;
  experienceYears?: number | null;
  services?: ServiceKey[];
  hourlyRate?: number | null;
  currency?: string;
  availability?: Availability;
  areasCovered?: Area[];
  openToRelocate?: boolean;
  languages?: string[];
  description?: string;
  offers?: Array<{ _id: string; offer: string; date: Date }>;
  offer?: { _id: string; offer: string; date: Date };
  images: Photo[];
  avatar?: string;
  verified?: boolean;
  claims?: { user: UserType };
  userType?: string;
  profileImage?: any;
  additionalUserInfo?: any[];
  creationDate?: string;
  updateDate?: string;
  chatAlertsDisabled?: boolean;
}

export interface Conversation {
  _id: string;
  participants: string;
  creationDate: string;
  updateDate: string;
  lastMsg: LastMsg;
  userTo: UserModel;
  unreadCount: number;
  meUserId: string;
  connected: boolean;
  alertsDisabled?: string[];
  favoritedBy?: string[];
}

export interface LastMsg {
  sender: string;
  message: string | null;
  type: 'message' | 'media';
  updateDate: string;
  deleted?: boolean;
}

//PHOTOS AND IMAGES
export interface Photo {
  // _id: string;
  userId: string;
  bucket: string;
  key: string;
  keyRezised: string;
  keyBlured: string;
  size: number;
  isProfile: boolean;
  etag: string;
  mimetype: string;
  contentType: string;
  originalname: string;
  isNew?: boolean;
  width: number;
  height: number;
  thumbWidth: number;
  thumbHeight: number;
  blobUrl?: string;
}

export interface ImageObj {
  bucket: string;
  contentType: string;
  key: string;
  keyRezised: string;
  mimetype: string;
  originalname: string;
  size: number;
  userId: string;
  width: number;
  height: number;
  thumbWidth: number;
  thumbHeight: number;
}

export interface ProfileImage {
  // _id: string;
  isNew: boolean;
  isProfile: boolean;
  key: string;
  keyRezised: string;
  width: number;
  height: number;
  thumbWidth: number;
  thumbHeight: number;
  blobUrl?: string;
  isLoading?: boolean;
}

//INBOX LIST

export interface InboxList {
  conversations: Conversation[];
  count: number;
}

// Oldest inbox item paged so far. `id` breaks ties on equal updateDates.
export interface InboxCursor {
  updateDate: string;
  id: string;
}

// BLOCKED USERS

export interface BlockedUsers {
  blockedUser: Partial<UserModel>;
}
