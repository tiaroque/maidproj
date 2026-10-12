import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Conversation,
  InboxCursor,
  InboxList,
} from './interfaces/user.interface';
import { environment } from '../../../environments/environment';
import { ChatDTO, MessageDTO } from './interfaces/message-dto';
import { differenceInSeconds, format } from 'date-fns';
import { UtilsService } from '../utils.service';

const time = 60;

const inboxCursorParams = (cursor: InboxCursor | null) =>
  cursor
    ? new HttpParams().set('lastDate', cursor.updateDate).set('lastId', cursor.id)
    : new HttpParams();

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private http = inject(HttpClient);

  utilsService = inject(UtilsService);

  // A null cursor asks for the first page, starting from the server's clock.
  deleteChatPhoto(messageId: string) {
    const url = `${environment.baseUrl}/api/chat/media/${encodeURIComponent(messageId)}`;
    return this.http.delete<{
      conversationId: string;
      messageId: string;
      isLastMessage: boolean;
    }>(url, { withCredentials: true });
  }

  getInbox(cursor: InboxCursor | null): Observable<InboxList> {
    const url = `${environment.baseUrl}/api/chat/inbox`;

    return this.http.get<InboxList>(url, {
      params: inboxCursorParams(cursor),
      withCredentials: true,
    });
  }

  getInboxCount(cursor: InboxCursor) {
    const params = inboxCursorParams(cursor);

    const url = `${environment.baseUrl}/api/chat/getInboxCount`;
    return this.http.get<{ count: number }>(url, {
      params,
      withCredentials: true,
    });
  }

  addToAlertsDisabled(conversationId: string) {
    const url = `${environment.baseUrl}/api/chat/addMeToDisableAlerts`;
    return this.http.post(
      url,
      { conversationId: conversationId },
      {
        withCredentials: true,
      },
    );
  }

  removeFromAlertsDisabled(conversationId: string) {
    const url = `${environment.baseUrl}/api/chat/removeFromDisableAlerts`;
    return this.http.post(
      url,
      { conversationId: conversationId },
      {
        withCredentials: true,
      },
    );
  }

  getFavorites(): Observable<Conversation[]> {
    const url = `${environment.baseUrl}/api/chat/favorites`;
    return this.http.get<Conversation[]>(url, {
      withCredentials: true,
    });
  }

  addToFavorites(conversationId: string) {
    const url = `${environment.baseUrl}/api/chat/addFavorite`;
    return this.http.post(
      url,
      { conversationId: conversationId },
      {
        withCredentials: true,
      },
    );
  }

  removeFromFavorites(conversationId: string) {
    const url = `${environment.baseUrl}/api/chat/removeFavorite`;
    return this.http.post(
      url,
      { conversationId: conversationId },
      {
        withCredentials: true,
      },
    );
  }

  // getTest() {
  //   // const url = `${environment.baseUrl}/api/chat/test`;
  //   const url = `http://127.0.0.1:3011/api/chat/test`;

  //   return this.http.get<Array<Conversation>>(url, {
  //     withCredentials: true,
  //     transferCache: false,
  //   });
  // }

  validadeConversation(userToUid: string): Observable<Conversation> {
    const params = new HttpParams().set('userToUid', userToUid);

    const url = `${environment.baseUrl}/api/chat/validadeConversation`;
    return this.http.get<Conversation>(url, {
      params,
      withCredentials: true,
    });
  }

  getConversationFull(userToUid: string): Observable<Array<Conversation>> {
    const params = new HttpParams().set('userToUid', userToUid);

    const url = `${environment.baseUrl}/api/chat/getConversationFull`;
    return this.http.get<Array<Conversation>>(url, {
      params,
      withCredentials: true,
    });
  }

  // // Runs when the chat page is loaded directly only having the query string
  // // param of the userTo in the chat, we need to get the details of that user
  // getUserTo(userToUid: string): Observable<any> {
  //   const params = new HttpParams().set('userToUid', userToUid);

  //   const url = `${environment.baseUrl}/api/chat/getUserTo`;
  //   return this.http.get(url, { params, withCredentials: true });
  // }

  getMessagesList(
    conversationId: string,
    lastDate: string,
    pageSize = 30,
  ): Observable<ChatDTO> {
    const params = new HttpParams()
      .set('conversationId', conversationId)
      .set('lastDate', lastDate)
      .set('pageSize', pageSize.toString());

    const url = `${environment.baseUrl}/api/chat/getMessages`;
    return this.http.get<ChatDTO>(url, {
      params,
      withCredentials: true,
    });
    // .pipe
    // delay(4000),
    // map(() => {
    //   throw new Error('');
    // }),
    // ();
  }

  groupMessagesDTO(messages: MessageDTO[]) {
    // const newMessagesList = structuredClone(messages);
    const newMessagesList = messages.map((a) => ({ ...a }));

    this.reduceFn(newMessagesList);
    this.addTimeLimits(newMessagesList);

    return newMessagesList;
  }

  reduceFn(messageList: MessageDTO[]) {
    return messageList.reduceRight(
      (accumulator: MessageDTO[], msg: MessageDTO) => {
        msg.groupType = [];

        const lastMsg = accumulator[0];

        // console.log(
        //   'date day: ',
        //   msg.date,
        //   msg.message,
        //   format(new Date(msg.date), 'EEEE', { locale: pt }),
        // );

        // Sets daily first message
        if (lastMsg) {
          const lastMessageDate = format(new Date(lastMsg.date), 'MM/dd/yyyy');
          const newMessageDate = format(new Date(msg.date), 'MM/dd/yyyy');

          if (newMessageDate !== lastMessageDate) {
            // msg.groupDaily = this.utilsService.manageDateFormat(
            //   new Date(msg.date),
            // );

            msg.groupDaily = msg.date;
          } else {
            msg.groupDaily = undefined;
          }
        } else {
          // msg.groupDaily = this.utilsService.manageDateFormat(
          //   new Date(msg.date),
          // );
          msg.groupDaily = msg.date;
        }

        // Groups messages by time intervals and differences
        if (lastMsg) {
          const diff = differenceInSeconds(
            new Date(msg.date),
            new Date(lastMsg.date),
          );

          if (diff > time || lastMsg.sender !== msg.sender) {
            msg.groupType.push('start');
            lastMsg.groupType?.push('end');
          }
        }
        accumulator.unshift(msg);
        return accumulator;
      },
      [],
    );
  }

  // Sets first and last message
  addTimeLimits(userMessages: MessageDTO[]) {
    // last items on the array are the oldest messages
    // first item on the array is the most recent message

    // userMessages[0].groupType?.every(val => val === 'start')

    const arrayLength = userMessages.length;
    if (arrayLength > 0) {
      userMessages[0].groupType?.push('end');
      userMessages[arrayLength - 1].groupType?.push('start');
    }
  }

  // getMessagesCount(conversationId: string, lastDate: string) {
  //   const params = new HttpParams()
  //     .set('conversationId', conversationId)
  //     .set('lastDate', lastDate);

  //   const url = `${environment.baseUrl}/api/chat/getMessagesCount`;
  //   return this.http.get<{ count: number }>(url, {
  //     params,
  //     withCredentials: true,
  //   });
  // }

  // public getMessages = () => {
  //   return Observable.create((observer) => {
  //     this.socket.on('new-message', (message) => {
  //       observer.next(message);
  //     });
  //   });
  // }
}
