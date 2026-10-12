import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { updateEntities, removeAllEntities } from '@ngrx/signals/entities';
import { computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ChatService } from '../chat.service';
import { InboxCursor } from '../interfaces/user.interface';
import {
  initNewMessageState,
  withNewMessageFeature,
} from './new-message.feature';
import { initUserMeState, withUserFeature } from './user.feature';
import { withChatMessagesFeature } from './chat-messages.feature';
import {
  filterConversations,
  selectConversationId,
  withChatConversationFeature,
} from './chat-conversations.feature';
import {
  initListFiltersState,
  withListFiltersFeature,
} from './list-filters.feature';
import {
  initListPagingState,
  withListPagingFeature,
} from './list-paging.feature';
import { withAssetsFeature } from './assets.feature';

export type ChatState = {
  inboxLoaded: boolean;
  currentUserId: string;
  lastCurrentConversationId: string | null;
  currentConversationId: string;
  currentConversationMessagesCount: number;
  conversationsListCount: number;
  // Oldest updateDate across the inbox pages loaded so far. Tracked
  // explicitly because the conversation collection also holds entities that
  // never came from a page, such as favorites and directly opened
  // conversations, which would otherwise drag the paging cursor backwards.
  conversationsCursor: InboxCursor | null;
  conversationsLoading: boolean;
  favoritesLoaded: boolean;
  favoritesOnly: boolean;
  // Translation key, resolved by whichever component surfaces the error.
  error: string | null;
  messagesLoading: boolean;
  pastMessagesLoading: boolean;
};

export const initChatState: ChatState = {
  inboxLoaded: false,
  currentUserId: '',
  lastCurrentConversationId: null,
  currentConversationId: '',
  currentConversationMessagesCount: 0,
  conversationsListCount: 0,
  conversationsCursor: null,
  conversationsLoading: false,
  favoritesLoaded: false,
  favoritesOnly: false,
  error: null,
  messagesLoading: false,
  pastMessagesLoading: false,
};

export const ChatStore = signalStore(
  { providedIn: 'root' },
  withState(initChatState),
  withUserFeature(),
  withChatConversationFeature(),
  withChatMessagesFeature(),
  withListFiltersFeature(),
  withListPagingFeature(),
  withAssetsFeature(),
  withNewMessageFeature(),
  withMethods((store, chatService = inject(ChatService)) => {
    // Bumped on every open or clear. A load that awaits the network checks
    // this before it writes the open conversation, so a slower response for
    // the previous person cannot overwrite the one now selected.
    let conversationRequestId = 0;

    const isCurrentConversationRequest = (requestId: number) =>
      requestId === conversationRequestId;

    const preservedConversationRoom = () =>
      store.currentConversationId() || store.lastCurrentConversationId();

    // Drop the open header while a conversation is still being resolved, and
    // keep the previous room id so it can be left when the next one joins.
    const holdConversationForResolve = () => {
      patchState(store, {
        lastCurrentConversationId: preservedConversationRoom(),
        currentConversationId: '',
        currentUserId: '',
        messagesLoading: true,
      });
    };

    return {
      //////////////////////////////////////////
      // // // // // //  PRIVATE // // // // ///
      //////////////////////////////////////////
      _setConversationIds(
        currentUserId: string,
        currentConversationId: string,
      ) {
        patchState(store, {
          currentUserId,
          currentConversationId,
          lastCurrentConversationId: preservedConversationRoom(),
        });
      },
      //////////////////////////////////////////
      // // // // // // PUBLIC // // // // // //
      //////////////////////////////////////////
      resetConversationIds() {
        conversationRequestId++;
        this._setConversationIds('', '');
        patchState(store, {
          messagesLoading: false,
          pastMessagesLoading: false,
        });
      },
      setFavoritesOnly(favoritesOnly: boolean) {
        patchState(store, { favoritesOnly });
      },
      clearError() {
        patchState(store, { error: null });
      },
      resetStore() {
        patchState(
          store,
          removeAllEntities({ collection: 'messages' }),
          removeAllEntities({ collection: 'conversation' }),
          removeAllEntities({ collection: 'list' }),
          initChatState,
          initListPagingState,
          initListFiltersState,
          initUserMeState,
          initNewMessageState,
        );
      },
      async getEmptyChatConversation() {
        conversationRequestId++;
        patchState(store, {
          currentUserId: '',
          currentConversationId: '',
          lastCurrentConversationId: preservedConversationRoom(),
          messagesLoading: false,
          conversationsListCount: 0,
        });
        await store._loadConversations(null);
        await store._checkConversationsCount();
        return true;
      },
      async getChatConversation(userToId: string, isNavigated: boolean) {
        const requestId = ++conversationRequestId;
        try {
          const myUserId = store.me().user.uid as string;
          const inboxLoaded = store.inboxLoaded();

          // Full browser load OR Redirected for the first time
          if (!isNavigated || !inboxLoaded) {
            holdConversationForResolve();
            const conversation = await firstValueFrom(
              chatService.validadeConversation(userToId),
            );
            await store._loadConversations(null);
            if (!isCurrentConversationRequest(requestId)) {
              return '';
            }
            if (!conversation?._id) {
              patchState(store, {
                messagesLoading: false,
                error: 'pleaseTryLater',
              });
              return '';
            }
            this._setConversationIds(userToId, conversation._id);

            return conversation._id;
          }

          // Try to find current Conversation in the already loaded stored
          const conversationList = store.conversationEntities();
          const conversationLocal = conversationList.find(
            (conv) =>
              conv.participants === userToId && conv.meUserId === myUserId,
          );

          if (!conversationLocal) {
            holdConversationForResolve();
            const conversations = await store._loadSingleConversation(userToId);
            await store._checkConversationsCount();
            if (!isCurrentConversationRequest(requestId)) {
              return '';
            }
            const conversation = conversations[0];
            if (!conversation?._id) {
              patchState(store, {
                messagesLoading: false,
                error: 'pleaseTryLater',
              });
              return '';
            }
            this._setConversationIds(userToId, conversation._id);
            return conversation._id;
          }

          this._setConversationIds(userToId, conversationLocal._id);
          return conversationLocal._id;
        } catch (error) {
          console.error('Failed to resolve conversation', error);
          if (!isCurrentConversationRequest(requestId)) {
            return '';
          }
          patchState(store, {
            messagesLoading: false,
            error: 'pleaseTryLater',
          });
          return '';
        }
      },
      toggleConnectionConversations(
        activeUsersIds: string[],
        connected: boolean,
      ) {
        const conversations = store.conversationEntities();
        const conversationIds = filterConversations(
          activeUsersIds,
          conversations,
        );
        patchState(
          store,
          updateEntities(
            { ids: conversationIds, changes: { connected } },
            { collection: 'conversation', selectId: selectConversationId },
          ),
        );
      },
    };
  }),
  withComputed(({ selectCurrentConversation, conversationEntities }) => ({
    conversationUserMeId: computed(() => selectCurrentConversation()?.meUserId),
    conversationUserToId: computed(
      () => selectCurrentConversation()?.participants,
    ),
    activeConversationsUserIds: computed(() =>
      conversationEntities().map((conversation) => conversation.userTo.uid),
    ),
  })),
);
