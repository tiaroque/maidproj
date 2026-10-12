import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStoreFeature,
  type,
  withComputed,
  withMethods,
} from '@ngrx/signals';

import {
  addEntities,
  addEntity,
  entityConfig,
  NamedEntityProps,
  NamedEntityState,
  removeEntity,
  SelectEntityId,
  setEntities,
  removeAllEntities,
  setEntity,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { MessageDTO } from '../interfaces/message-dto';
import { ChatService } from '../chat.service';
import { ChatState } from './store';
import {
  catchError,
  defer,
  EMPTY,
  finalize,
  Subject,
  takeUntil,
  tap,
  throwError,
} from 'rxjs';
import { Conversation } from '../interfaces/user.interface';
import { selectConversationId } from './chat-conversations.feature';

export const selectMessageId: SelectEntityId<MessageDTO> = (message) =>
  message._id;

const messagesConfig = entityConfig({
  entity: type<MessageDTO>(),
  collection: 'messages',
  selectId: selectMessageId,
});

export function withChatMessagesFeature<_>() {
  return signalStoreFeature(
    {
      state: type<NamedEntityState<Conversation, 'conversation'> & ChatState>(),
      props: type<NamedEntityProps<Conversation, 'conversation'>>(),
      methods: type<
        {
          _loadSingleConversation(userToUid: string): Promise<Conversation[]>;
        } & { _checkConversationsCount(): Promise<void> }
      >(),
    },
    withEntities(messagesConfig),
    withMethods((store, chatService = inject(ChatService)) => {
      // pastMessagesLoading only turns on after the spinner delay, so it
      // cannot stop a second click on "more messages" in the meantime.
      let pastMessagesRequestActive = false;

      return {
        //////////////////////////////////////////
        // // // // // //  PRIVATE // // // // ///
        //////////////////////////////////////////
        _startMessagesLoader(reset: boolean) {
          const timeoutId = setTimeout(() => {
            patchState(
              store,
              reset ? { messagesLoading: true } : { pastMessagesLoading: true },
            );
          }, 200);

          return timeoutId;
        },
        _stopMessagesLoader(reset: boolean, timeoutId: NodeJS.Timeout) {
          clearTimeout(timeoutId);
          patchState(store, {
            ...(reset && { messagesLoading: false }),
            ...(!reset && { pastMessagesLoading: false }),
          });
        },
        _getNewMessages$(
          conversationId: string,
          lastDate: string,
          reset = true,
        ) {
          return chatService.getMessagesList(conversationId, lastDate).pipe(
            tap((chatDto) => {
              const messagesGrouped = chatDto.messages.map<MessageDTO>(
                (msg) => ({
                  ...msg,
                  groupType: [],
                }),
              );

              // The thread is cleared before it is opened, so the first page is
              // merged rather than replacing the collection. Replacing would drop
              // socket messages received while this request was in flight.
              const method = reset
                ? setEntities(messagesGrouped, {
                    collection: 'messages',
                    selectId: selectMessageId,
                  })
                : addEntities(messagesGrouped, {
                    collection: 'messages',
                    selectId: selectMessageId,
                  });

              patchState(store, method, {
                currentConversationMessagesCount: chatDto.count,
              });
            }),
            catchError((error) => {
              // A failed older page must keep the count already loaded, or the
              // "more messages" button disappears and the page cannot be retried.
              if (reset) {
                patchState(store, {
                  currentConversationMessagesCount: 0,
                });
              }
              return throwError(() => error);
            }),
          );
        },
        //////////////////////////////////////////
        // // // // // // PUBLIC // // // // // //
        //////////////////////////////////////////
        // The loader is started on subscribe and always stopped on unsubscribe,
        // so a cancelled switchMap cannot leave the spinner running.
        loadConversationMessages$(conversationId: string, lastDate: string) {
          return defer(() => {
            const timeoutId = this._startMessagesLoader(true);
            return this._getNewMessages$(conversationId, lastDate).pipe(
              finalize(() => this._stopMessagesLoader(true, timeoutId)),
            );
          });
        },
        markMediaDeleted(event: {
          conversationId: string;
          messageId: string;
          isLastMessage: boolean;
        }) {
          if (!event?.messageId || !event.conversationId) {
            return;
          }

          if (store.messagesEntityMap()[event.messageId]) {
            patchState(
              store,
              updateEntity(
                {
                  id: event.messageId,
                  changes: { message: null, deleted: true, loading: false },
                },
                { collection: 'messages', selectId: selectMessageId },
              ),
            );
          }

          const conversation =
            store.conversationEntityMap()[event.conversationId];
          if (event.isLastMessage && conversation?.lastMsg) {
            patchState(
              store,
              updateEntity(
                {
                  id: event.conversationId,
                  changes: {
                    lastMsg: {
                      ...conversation.lastMsg,
                      message: null,
                      type: 'media',
                      deleted: true,
                    },
                  },
                },
                { collection: 'conversation', selectId: selectConversationId },
              ),
            );
          }
        },
        removeMessage(messageId: string) {
          patchState(
            store,
            removeEntity(messageId, { collection: 'messages' }),
          );
        },
        loadMoreMessages(destroy$: Subject<boolean>) {
          const conversationId = store.currentConversationId();
          const conversation = store.conversationEntityMap()[conversationId];
          const messageMinDate = getOldestDateMessage(
            store
              .messagesEntities()
              .filter((message) => message.conversationId === conversationId),
          );

          // Nothing loaded yet means there is no cursor to page back from.
          if (!conversation || !messageMinDate || pastMessagesRequestActive) {
            return;
          }

          pastMessagesRequestActive = true;
          const timeoutId = this._startMessagesLoader(false);

          this._getNewMessages$(conversation._id, messageMinDate, false)
            .pipe(
              takeUntil(destroy$),
              catchError((error) => {
                console.error('Failed to load past messages', error);
                return EMPTY;
              }),
              finalize(() => {
                pastMessagesRequestActive = false;
                this._stopMessagesLoader(false, timeoutId);
              }),
            )
            .subscribe();
        },
        // Only the RECEIVER that is NOT on the Room gets this message
        async addWebsocketHiddenMessage(message: MessageDTO) {
          try {
            const conversation =
              store.conversationEntityMap()[message.conversationId];

            // If no conversation in the list load it from the database, which
            // already carries the up to date lastMsg and unread count.
            if (!conversation) {
              await store._loadSingleConversation(message.sender);
              await store._checkConversationsCount();
              return true;
            }

            const updateConversationEntity =
              updateOnNewMessageConversations(message);

            const count =
              message.unreadCount ?? (conversation.unreadCount || 0) + 1;

            const updateOnNewMessageUnreadEntity = updateOnNewMessageUnread(
              message,
              count,
            );

            patchState(
              store,
              updateConversationEntity,
              updateOnNewMessageUnreadEntity,
            );

            return true;
          } catch (error) {
            console.error('Failed to handle hidden message', error);
            return false;
          }
        },
        async addWebsocketNewMessage(message: MessageDTO) {
          try {
            const updateConversationEntity =
              updateOnNewMessageConversations(message);
            const updatesMessagesEntity = updateOnNewMessageMessages(message);

            patchState(store, updateConversationEntity, updatesMessagesEntity);
            return true;
          } catch (error) {
            console.error('Failed to handle new message', error);
            return false;
          }
        },
        resetMessages() {
          patchState(store, removeAllEntities({ collection: 'messages' }), {
            currentConversationMessagesCount: 0,
          });
        },
      };
    }),
    withComputed(({ currentConversationId, messagesEntities }) => ({
      sortedMessages: computed(() => {
        const convId = currentConversationId();
        if (!convId) {
          return [];
        }

        // Filter first so the sort runs on a copy and never mutates the
        // array cached by the messagesEntities computed.
        return messagesEntities()
          .filter((message) => message.conversationId === convId)
          .sort((a, b) => (a.date > b.date ? -1 : 1));
      }),
    })),
    withComputed(({ sortedMessages }, chatService = inject(ChatService)) => ({
      groupedMessages: computed(() => {
        const chatMessages = sortedMessages();
        const newMessagesListGrouped =
          chatService.groupMessagesDTO(chatMessages);
        return newMessagesListGrouped;
      }),
    })),
  );
}

export const getNewestDateMessageObject = (
  messages: MessageDTO[],
): MessageDTO | null => {
  if (messages.length === 0) {
    return null;
  }

  return messages.reduce(function (a, b) {
    return a.date > b.date ? a : b;
  });
};

export const getOldestDateMessage = (messages: MessageDTO[]): string | null => {
  if (messages.length === 0) {
    return null;
  }

  return messages
    .map((msg) => msg.date)
    .reduce(function (a, b) {
      return a < b ? a : b;
    });
};

export const updateOnNewMessageMessages = (message: MessageDTO) => {
  const newMessage = message;

  // // Text  messages have 'newMessage.loading === null'
  // // Media messages have 'newMessage.loading'
  // // these 2 types are all new messages
  if (newMessage.loading === null || newMessage.loading) {
    return addEntity(newMessage, {
      collection: 'messages',
      selectId: selectMessageId,
    });
  } else {
    // isNewMessage = false;

    return setEntity(newMessage, {
      collection: 'messages',
      selectId: selectMessageId,
    });
  }
};

export const updateOnNewMessageConversations = (message: MessageDTO) => {
  // Conversations update Last Message
  const updateConversationEntity = updateEntity(
    {
      id: message.conversationId,
      changes: {
        updateDate: message.date,
        lastMsg: {
          message: message.message as string, // TODO: can be Image
          sender: message.sender,
          type: message.type,
          updateDate: message.date,
        },
      },
    },
    { collection: 'conversation', selectId: selectConversationId },
  );
  return updateConversationEntity;
};

export const updateOnNewMessageUnread = (
  message: MessageDTO,
  count: number,
) => {
  // Conversations update Last Message
  const updateConversationEntity = updateEntity(
    {
      id: message.conversationId,
      changes: {
        unreadCount: count,
      },
    },
    { collection: 'conversation', selectId: selectConversationId },
  );
  return updateConversationEntity;
};
