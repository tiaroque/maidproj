import {
  patchState,
  signalStoreFeature,
  type,
  withMethods,
  withState,
} from '@ngrx/signals';
import { ChatState } from './store';
import { Metadata } from '../interfaces/list.interface';
import { firstValueFrom } from 'rxjs';
import { ListService } from '../list.service';
import { inject } from '@angular/core';
import { UserDetailsObject, UserType } from '../interfaces/user.interface';
import {
  entityConfig,
  SelectEntityId,
  withEntities,
  addEntities,
  setAllEntities,
  updateEntity,
} from '@ngrx/signals/entities';

const PAGE_SIZE = 30;

export const selectUserId: SelectEntityId<UserDetailsObject> = (user) =>
  user._id;

const config = entityConfig({
  entity: type<UserDetailsObject>(),
  collection: 'list',
  selectId: selectUserId,
});

type ListPagingState = {
  listIsLoading: boolean;
  listHasMore: boolean;
  metadata: Metadata;
  // Offer/dream chips and scroll offset of the last list visit, so a back
  // navigation can show the list exactly as it was left.
  listSearchTerms: string[];
  listScrollTop: number;
};

export const initListPagingState: ListPagingState = {
  listIsLoading: false,
  listHasMore: true,
  metadata: {
    count: 0,
    totalCount: 0,
    pageNumber: 0,
    pageSize: PAGE_SIZE,
  },
  listSearchTerms: [],
  listScrollTop: 0,
};

export function withListPagingFeature<_>() {
  return signalStoreFeature(
    {
      state: type<ChatState>(),
    },
    withEntities(config),
    withState<ListPagingState>(initListPagingState),
    withMethods((store, listService = inject(ListService)) => ({
      async loadNextListPage(
        type: UserType,
        searchTerms: string[],
        globalFilters: Map<string, string[]>,
        resetList: boolean,
      ) {
        if (!resetList && store.listIsLoading()) {
          return;
        }
        try {
          let curretPageNumber = store.metadata.pageNumber();
          if (resetList) {
            curretPageNumber = 0;
          }

          const pageSize = store.metadata.pageSize();

          patchState(store, { listIsLoading: true });

          let pageNumber = ++curretPageNumber;

          const listPaging = await firstValueFrom(
            listService.getList(
              type,
              pageNumber,
              pageSize,
              searchTerms,
              globalFilters,
            ),
          );

          const previouscount = resetList ? 0 : store.metadata.count();
          const count = previouscount + listPaging.data.length;

          // if the backed return 0 new entities dont update the page number
          if (listPaging.data.length === 0) {
            --pageNumber;
          }

          const addListUsers = resetList
            ? setAllEntities(listPaging.data, {
                collection: 'list',
                selectId: selectUserId,
              })
            : addEntities(listPaging.data, {
                collection: 'list',
                selectId: selectUserId,
              });

          patchState(store, addListUsers, {
            listIsLoading: false,
            listHasMore: listPaging.data.length > 0,
            metadata: { ...listPaging.metadata, pageNumber, count, pageSize },
          });
        } catch (error) {
          console.error('Failed to load list page', error);
          // Stop paging so the infinite scroll doesn't retry in a loop; the
          // next search resets it.
          patchState(store, {
            listIsLoading: false,
            listHasMore: false,
            error: 'pleaseTryLater',
          });
        }
      },
      setListSearchTerms(listSearchTerms: string[]) {
        patchState(store, { listSearchTerms });
      },
      setListScrollTop(listScrollTop: number) {
        patchState(store, { listScrollTop });
      },
      markProfileVisited(uid: string) {
        const match = store
          .listEntities()
          .find((item) => item.user?.uid === uid);
        if (!match || match.visitedByMe) {
          return;
        }

        patchState(
          store,
          updateEntity(
            { id: match._id, changes: { visitedByMe: true } },
            { collection: 'list', selectId: selectUserId },
          ),
        );
      },
    })),
  );
}
