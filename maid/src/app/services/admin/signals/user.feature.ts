import {
  patchState,
  signalStoreFeature,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Photo, UserDetailsObject } from '../interfaces/user.interface';
import { computed, inject } from '@angular/core';
import { produce } from 'immer';
import { firstValueFrom } from 'rxjs';
import { UserService } from '../../user.service';

export type CheckAuth = { hasUserType: boolean; emailVerified: boolean };
export type MeUser = { me: UserDetailsObject };

export const initUserMeState: MeUser = {
  me: <UserDetailsObject>{},
};

export function withUserFeature() {
  return signalStoreFeature(
    withState<MeUser>(initUserMeState),
    withMethods((store, userService = inject(UserService)) => ({
      //////////////////////////////////////////
      // // // // // // PUBLIC // // // // // //
      //////////////////////////////////////////
      addMeUser(me: UserDetailsObject): void {
        patchState(store, { me });
      },
      // Resolves to false when the server rejected the change, which is then
      // rolled back.
      async setChatAlertsDisabled(disabled: boolean): Promise<boolean> {
        const previous = !!store.me().user?.chatAlertsDisabled;
        const apply = (value: boolean) =>
          patchState(store, (state) =>
            produce(state, (draft) => {
              if (draft.me.user) {
                draft.me.user.chatAlertsDisabled = value;
              }
            }),
          );

        apply(disabled);
        try {
          await firstValueFrom(userService.setChatAlertsDisabled(disabled));
          return true;
        } catch (error) {
          console.error('Failed to update chat alerts', error);
          apply(previous);
          return false;
        }
      },
      addImagesToUser(image: Photo) {
        patchState(store, (state) =>
          produce(state, (draft) => {
            draft.me.user.images.push(image);
          }),
        );
      },
      removeUserImage(key: string) {
        patchState(store, (state) =>
          produce(state, (draft) => {
            draft.me.user.images = draft.me.user.images.filter(
              (image) => image.key !== key,
            );
          }),
        );
      },
      setProfilePic(key: string) {
        patchState(store, (state) =>
          produce(state, (draft) => {
            const images = draft.me.user.images;

            const updatedImages = images.map((image) => {
              if (image.key === key) {
                return { ...image, isProfile: true };
              } else {
                return { ...image, isProfile: false };
              }
            });

            draft.me.user.images = updatedImages;
            delete draft.me.user.avatar;
          }),
        );
      },
      setAvatar(avatar: string) {
        patchState(store, (state) =>
          produce(state, (draft) => {
            draft.me.user.images = (draft.me.user.images ?? []).map(
              (image) => ({ ...image, isProfile: false }),
            );
            draft.me.user.avatar = avatar;
          }),
        );
      },
    })),
    withComputed(({ me }) => ({
      userType: computed(() => {
        return me().user?.userType;
      }),
    })),
  );
}
