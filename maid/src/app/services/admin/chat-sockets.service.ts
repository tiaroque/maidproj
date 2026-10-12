import { HttpClient } from '@angular/common/http';
import {
  ApplicationRef,
  Injectable,
  PLATFORM_ID,
  afterNextRender,
  inject,
  isDevMode,
} from '@angular/core';
// import { Socket } from 'ngx-socket-io';
import { first, Observable } from 'rxjs';
import { MessageDTO } from './interfaces/message-dto';
import { environment } from '../../../environments/environment';
import { isPlatformBrowser } from '@angular/common';
import type { Socket } from 'socket.io-client';
import { AuthService } from '../auth.service';
import { ChatStore } from './signals/store';
import { ChatAlertsService } from './chat-alerts.service';
import { UserDetailsObject } from './interfaces/user.interface';

export interface SocketUserData {
  userId: string;
  activeConversations: string[];
}

@Injectable({
  providedIn: 'root',
})
export class ChatSocketsService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private authService = inject(AuthService);

  // private socket: Socket,

  socket?: Socket;
  readonly storeChat = inject(ChatStore);
  private chatAlerts = inject(ChatAlertsService);

  applicationRef = inject(ApplicationRef);
  private socketPromise?: Promise<Socket>;

  constructor() {
    afterNextRender(() => {
      const me = this.storeChat.me();
      if (me?.user?.uid) {
        this.getSocket();
      }
    });
  }

  // Presence is based on open sockets, so this runs on every logged-in page,
  // not only the chat.
  connect() {
    if (!isPlatformBrowser(this.platformId) || !this.storeChat.me()?.user?.uid) {
      return;
    }
    this.getSocket().catch((error) =>
      console.error('Socket connection failed', error),
    );
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = undefined;
    this.socketPromise = undefined;
  }

  private async getSocket(): Promise<Socket> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('Socket is only available in the browser');
    }
    if (this.socket) {
      return this.socket;
    }
    if (!this.socketPromise) {
      this.socketPromise = (async () => {
        const { io } = await import('socket.io-client');
        const me = this.storeChat.me();
        const socketUrl =
          environment.socketUrl || environment.baseUrl || undefined;
        this.socket = io(socketUrl, {
          withCredentials: true,
          path: '/api/socket.io',
          transports: ['websocket'],
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket connection failed', {
            message: error.message,
            url: socketUrl || window.location.origin,
            path: '/api/socket.io',
          });
        });

        if (me?.user?.uid) {
          this.websocketsSubscriptions(me);
        }
        this.socket.on('mediaDeleted', (event) => {
          this.storeChat.markMediaDeleted(event);
        });
        return this.socket;
      })();
    }
    return this.socketPromise;
  }

  websocketsSubscriptions(me: UserDetailsObject) {
    const userId = me.user.uid;

    // broadcasts a user that has just connected
    const subConnected = this.subscribeBroadcastChannel<string>(
      'connected',
    ).subscribe((userId) => {
      this.storeChat.toggleConnectionConversations([userId], true);
    });
    // this.subscriptions.push(subConnected);

    const subDisconnected = this.subscribeBroadcastChannel<string>(
      'disconnected',
    ).subscribe((userId) => {
      this.storeChat.toggleConnectionConversations([userId], false);
    });
    // this.subscriptions.push(subDisconnected);

    // Get Messages SENT in the room
    const subMessages2 = this.subscribeMessages<MessageDTO>().subscribe(
      async (message) => {
        this.storeChat.setNewMessageStatus(message);

        await this.storeChat.addWebsocketNewMessage(message);
        this.alertIfNeeded(message);
      },
    );
    // this.subscriptions.push(subMessages2);

    // Get Messages SENT directly to the user because I am NOT in the room with the SENDER
    const subMessages = this.subscribeChannel<MessageDTO>(
      userId,
      'message',
    ).subscribe(async (message) => {
      this.storeChat.setNewMessageStatus(message);

      // Wait for a conversation missing from the inbox to be loaded, so its
      // muted state is known before deciding to alert.
      await this.storeChat.addWebsocketHiddenMessage(message);
      this.alertIfNeeded(message);
    });
    // this.subscriptions.push(subMessages);
  }

  private alertIfNeeded(message: MessageDTO) {
    if (this.storeChat.shouldAlertFor(message)) {
      this.chatAlerts.notifyNewMessage();
    }
  }

  onDisconnect(): Observable<string> {
    return new Observable<string>((observer) => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      let active = true;
      this.getSocket().then((socket) => {
        if (!active) return;
        socket.on('disconnect', (data: Socket.DisconnectReason) => {
          observer.next(data);
        });
      });
      return () => {
        active = false;
      };
    });
  }

  onReConnect(): Observable<string> {
    return new Observable<string>((observer) => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      let active = true;
      this.getSocket().then((socket) => {
        if (!active) return;
        socket.io.on('reconnect', () => {
          observer.next('reconnect');
        });
      });
      return () => {
        active = false;
      };
    });
  }

  onConnect(): Observable<string> {
    return new Observable<string>((observer) => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      let active = true;
      this.getSocket().then((socket) => {
        if (!active) return;
        socket.on('connect', () => {
          observer.next('connected');
        });
      });
      return () => {
        active = false;
      };
    });
  }

  async joinRoom(conversationId: string) {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const socket = await this.getSocket();
    socket.emit('joinRoom', conversationId);
  }

  async leaveRoom(conversationId: string) {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const socket = await this.getSocket();
    socket.emit('leaveRoom', conversationId);
  }

  async sendData(
    conversationId: string,
    message: MessageDTO,
    event: 'message' | 'media',
  ) {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const socket = await this.getSocket();
    socket.emit(event, conversationId, message);
  }

  async sendIsTyping(userToId: string, conversationId: string, isTyping: boolean) {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const socket = await this.getSocket();
    socket.emit('typing', userToId, conversationId, isTyping);
  }

  async informUsersConnectionState(socketUserData: SocketUserData) {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const socket = await this.getSocket();
    socket.emit('getUsersConnectionState', socketUserData);
  }

  // getOldMessages(uid: string, conversationId: string) {
  //   this.socket.emit('getoldMessages', uid, conversationId);
  // }

  subscribeMessages<MessageDTO>() {
    return new Observable<MessageDTO>((observer) => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      let active = true;
      this.getSocket().then((socket) => {
        if (!active) return;
        socket.on('message', (data) => {
          observer.next(data);
        });
      });
      return () => {
        active = false;
      };
    });
  }

  subscribeChannel<T>(
    userid: string,
    type: 'message' | 'active_users' | 'typing',
  ): Observable<T> {
    return new Observable<T>((observer) => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      let active = true;
      this.getSocket().then((socket) => {
        if (!active) return;
        socket.on(`${userid}_${type}`, (data) => {
          observer.next(data);
        });
      });
      return () => {
        active = false;
      };
    });
  }

  subscribeBroadcastChannel<T>(
    type: 'connected' | 'disconnected',
  ): Observable<T> {
    return new Observable<T>((observer) => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      let active = true;
      this.getSocket().then((socket) => {
        if (!active) return;
        socket.on(type, (data) => {
          observer.next(data);
        });
      });
      return () => {
        active = false;
      };
    });
  }

  // // fromEvent Message
  // subscribeChannelMessage(userid: string): Observable<MessageDTO> {
  //   return this.socket?.fromEvent<MessageDTO>(`${userid}_message`) as Observable<MessageDTO>;
  // }

  // subscribeChannelActiveUsers(userid: string): Observable<MessageDTO> {
  //   return this.socket?.fromEvent<MessageDTO>(`${userid}_active_users`) as Observable<MessageDTO>;
  // }
}
