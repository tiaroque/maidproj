import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStoreFeature,
  type,
  withComputed,
  withMethods,
} from '@ngrx/signals';
import {
  entityConfig,
  removeEntity,
  SelectEntityId,
  updateEntity,
  upsertEntities,
  upsertEntity,
  withEntities,
} from '@ngrx/signals/entities';
import {
  Conversation,
  InboxCursor,
  InboxList,
} from '../interfaces/user.interface';
import { ChatService } from '../chat.service';
import { UserService } from '../../user.service';
import { firstValueFrom } from 'rxjs';
import { ChatState } from './store';
import { ListService } from '../list.service';

const INBOX_RETRY_DELAY_MS = 5000;
import { MeUser } from './user.feature';

export const selectConversationId: SelectEntityId<Conversation> = (
  conversation,
) => conversation._id;

const conversationConfig = entityConfig({
  entity: type<Conversation>(),
  collection: 'conversation',
  selectId: selectConversationId,
});

export function withChatConversationFeature<_>() {
  return signalStoreFeature(
    {
      state: type<ChatState & MeUser>(),
    },
    withEntities(conversationConfig),
    withMethods(
      (
        store,
        chatService = inject(ChatService),
        userService = inject(UserService),
        listService = inject(ListService),
      ) => {
        // Conversations with an alerts request in flight. Toggles are ignored
        // until it settles, so requests cannot reach the server out of order.
        const pendingAlertToggles = new Set<string>();

        return {
        //////////////////////////////////////////
        // // // // // //  PRIVATE // // // // ///
        //////////////////////////////////////////
        async _loadSingleConversation(
          userToUid: string,
        ): Promise<Conversation[]> {
          try {
            const conversationsList = await firstValueFrom(
              chatService.getConversationFull(userToUid),
            );
            patchState(
              store,
              upsertEntities(conversationsList, {
                collection: 'conversation',
                selectId: selectConversationId,
              }),
            );
            return conversationsList;
          } catch (error) {
            console.error('Failed to load conversation', error);
            return [];
          }
        },
        async _loadConversations(cursor: InboxCursor | null) {
          try {
            const inboxList: InboxList = await firstValueFrom(
              chatService.getInbox(cursor),
            );

            const conversations = inboxList.conversations;

            patchState(
              store,
              // Upsert so a refetch refreshes conversations already in the
              // store instead of silently dropping the server state.
              upsertEntities(conversations, {
                collection: 'conversation',
                selectId: selectConversationId,
              }),
              {
                conversationsListCount: inboxList.count,
                inboxLoaded: true,
                conversationsCursor: nextConversationsCursor(
                  store.conversationsCursor(),
                  conversations,
                ),
              },
            );

            if (!store.favoritesLoaded()) {
              await this._loadFavorites();
            }
            return true;
          } catch (error) {
            console.error('Failed to load inbox', error);
            return false;
          }
        },
        async _loadFavorites() {
          try {
            const favorites = await firstValueFrom(chatService.getFavorites());
            // Favorites live in the same collection as every other
            // conversation, so there is a single source of truth. They do not
            // move the paging cursor, which only tracks inbox pages.
            patchState(
              store,
              upsertEntities(favorites, {
                collection: 'conversation',
                selectId: selectConversationId,
              }),
              { favoritesLoaded: true },
            );
          } catch (error) {
            console.error('Failed to load favorites', error);
          }
        },
        async _checkConversationsCount() {
          try {
            const cursor = store.conversationsCursor();

            if (!cursor) {
              patchState(store, {
                conversationsListCount: 0,
                inboxLoaded: true,
              });
              return;
            }

            const countObj = await firstValueFrom(
              chatService.getInboxCount(cursor),
            );

            patchState(store, {
              conversationsListCount: countObj.count,
              inboxLoaded: true,
            });
          } catch (error) {
            console.error('Failed to refresh inbox count', error);
          }
        },
        //////////////////////////////////////////
        // // // // // // PUBLIC // // // // // //
        //////////////////////////////////////////
        async loadMoreConversations() {
          if (store.conversationsLoading()) {
            return;
          }
          patchState(store, { conversationsLoading: true });
          try {
            const loaded = await this._loadConversations(
              store.conversationsCursor(),
            );
            // Paging stays enabled after a failure, so hold the loading flag
            // for a while to keep a visible end marker from retrying in a
            // tight loop.
            if (!loaded) {
              await new Promise((resolve) =>
                setTimeout(resolve, INBOX_RETRY_DELAY_MS),
              );
            }
          } finally {
            patchState(store, { conversationsLoading: false });
          }
        },
        async blockUser(userId: string, conversationId: string) {
          try {
            await firstValueFrom(userService.blockUser(userId));
            patchState(
              store,
              removeEntity(conversationId, { collection: 'conversation' }),
            );

            if (store.conversationEntities().length === 0) {
              // The list is empty again, so paging has to restart from the top.
              patchState(store, { conversationsCursor: null });
              await this._loadConversations(null);
            }
          } catch (error) {
            console.error('Failed to block user', error);
            patchState(store, { error: 'pleaseTryLater' });
          }
        },
        async toggleAlerts(conversation?: Conversation) {
          const myId = store.me()?.user?.uid;
          const conversationId =
            conversation?._id ?? store.currentConversationId();
          if (
            !myId ||
            !conversationId ||
            pendingAlertToggles.has(conversationId)
          ) {
            return;
          }

          const source =
            store.conversationEntityMap()[conversationId] ?? conversation;
          if (!source) {
            return;
          }

          const previousAlerts = source.alertsDisabled ?? [];
          const isDisabled = previousAlerts.includes(myId);
          const nextAlerts = isDisabled
            ? previousAlerts.filter((id) => id !== myId)
            : [...previousAlerts, myId];

          pendingAlertToggles.add(conversationId);
          patchState(store, setConversationAlerts(source, nextAlerts));

          let settledAlerts = nextAlerts;
          try {
            await firstValueFrom(
              isDisabled
                ? chatService.removeFromAlertsDisabled(conversationId)
                : chatService.addToAlertsDisabled(conversationId),
            );
          } catch (error) {
            console.error('Failed to toggle conversation alerts', error);
            settledAlerts = previousAlerts;
          } finally {
            // Apply on top of the latest entity: an inbox refetch may have
            // replaced it with pre-toggle server data while the request ran.
            const latest = store.conversationEntityMap()[conversationId];
            if (latest) {
              patchState(store, setConversationAlerts(latest, settledAlerts));
            }
            pendingAlertToggles.delete(conversationId);
          }
        },
        async toggleFavorite(conversation: Conversation) {
          const myId = store.me()?.user?.uid;
          if (!myId) {
            return;
          }

          const source =
            store.conversationEntityMap()[conversation._id] ?? conversation;
          const previousFavoritedBy = source.favoritedBy ?? [];
          const wasFavorite = previousFavoritedBy.includes(myId);
          const nextFavoritedBy = wasFavorite
            ? previousFavoritedBy.filter((id) => id !== myId)
            : [...previousFavoritedBy, myId];

          patchState(store, setConversationFavorites(source, nextFavoritedBy));

          try {
            await firstValueFrom(
              wasFavorite
                ? chatService.removeFromFavorites(conversation._id)
                : chatService.addToFavorites(conversation._id),
            );
          } catch (error) {
            console.error('Failed to toggle favorite', error);
            patchState(
              store,
              setConversationFavorites(source, previousFavoritedBy),
            );
          }
        },
        async resetUnread(conversationId: string) {
          // Always hit the server: the local count can be stale (other tabs or
          // devices, missed socket events).
          try {
            await firstValueFrom(listService.resetUnread(conversationId));

            const updateConversationEntity = updateEntity(
              {
                id: conversationId,
                changes: {
                  unreadCount: 0,
                },
              },
              { collection: 'conversation', selectId: selectConversationId },
            );

            patchState(store, updateConversationEntity);
          } catch (error) {
            console.error('Failed to reset unread count', error);
          }
        },
        };
      },
    ),
    withComputed(
      ({
        conversationEntities,
        conversationEntityMap,
        currentConversationId,
        me,
      }) => ({
        selectCurrentConversation: computed(
          () => conversationEntityMap()[currentConversationId()],
        ),
        userTo: computed(
          () => conversationEntityMap()[currentConversationId()]?.userTo,
        ),
        sortedConversations: computed(() => {
          const myId = me()?.user?.uid;
          return conversationEntities()
            .slice()
            .sort((a, b) => {
              const aFavorite = myId && a.favoritedBy?.includes(myId) ? 1 : 0;
              const bFavorite = myId && b.favoritedBy?.includes(myId) ? 1 : 0;
              if (aFavorite !== bFavorite) {
                return bFavorite - aFavorite;
              }
              return compareNewestFirst(a, b);
            });
        }),
        // Same rule as the conversation list badges: the open conversation and
        // conversations where I sent the last message do not count.
        unreadTotal: computed(() =>
          conversationEntities().reduce(
            (total, conversation) =>
              conversation._id !== currentConversationId() &&
              conversation.lastMsg?.sender !== conversation.meUserId
                ? total + (conversation.unreadCount || 0)
                : total,
            0,
          ),
        ),
        favorites: computed(() => {
          const myId = me()?.user?.uid;
          if (!myId) {
            return [];
          }

          return conversationEntities()
            .filter((conversation) => conversation.favoritedBy?.includes(myId))
            .sort(compareNewestFirst);
        }),
      }),
    ),
  );
}

// Upsert rather than update, because a conversation can be toggled before it
// has been pulled into the collection by an inbox page.
const setConversationFavorites = (
  conversation: Conversation,
  favoritedBy: string[],
) => {
  const next: Conversation = { ...conversation, favoritedBy };
  return upsertEntity(next, {
    collection: 'conversation',
    selectId: selectConversationId,
  });
};

const setConversationAlerts = (
  conversation: Conversation,
  alertsDisabled: string[],
) => {
  const next: Conversation = { ...conversation, alertsDisabled };
  return upsertEntity(next, {
    collection: 'conversation',
    selectId: selectConversationId,
  });
};

export const filterConversations = (
  activeUsers: string[],
  conversations: Conversation[],
) => {
  const converstionsIds = conversations
    .filter((conversation) => activeUsers.includes(conversation.participants))
    .map((user) => user._id);
  return converstionsIds;
};

// Mirrors the server's inbox order (updateDate desc, then _id desc), so ties
// keep a stable position between renders.
const compareCursors = (a: InboxCursor, b: InboxCursor) => {
  if (a.updateDate !== b.updateDate) {
    return a.updateDate > b.updateDate ? -1 : 1;
  }
  if (a.id !== b.id) {
    return a.id > b.id ? -1 : 1;
  }
  return 0;
};

const toCursor = (conversation: Conversation): InboxCursor => ({
  updateDate: conversation.updateDate,
  id: conversation._id,
});

export const compareNewestFirst = (a: Conversation, b: Conversation) =>
  compareCursors(toCursor(a), toCursor(b));

// The cursor only ever moves further back in time, so reloading a newer page
// cannot make paging skip over conversations it has not fetched yet.
export const nextConversationsCursor = (
  currentCursor: InboxCursor | null,
  page: Conversation[],
): InboxCursor | null => {
  if (page.length === 0) {
    return currentCursor;
  }
  const oldest = page.map(toCursor).sort(compareCursors)[page.length - 1];
  if (!currentCursor) {
    return oldest;
  }

  return compareCursors(oldest, currentCursor) > 0 ? oldest : currentCursor;
};
