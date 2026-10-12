import {
  patchState,
  signalStoreFeature,
  type,
  withMethods,
  withState,
} from '@ngrx/signals';
import { ChatState } from './store';
import { MessageDTO } from '../interfaces/message-dto';
import { MeUser } from './user.feature';
import { NamedEntityProps, NamedEntityState } from '@ngrx/signals/entities';
import { Conversation } from '../interfaces/user.interface';

export type MessageStatus = 'idle' | 'mine' | 'other';
export type NewMessageState = {
  messageStatus: { type: MessageStatus };
};

export const initNewMessageState: NewMessageState = {
  messageStatus: { type: 'idle' },
};

export function withNewMessageFeature<_>() {
  return signalStoreFeature(
    {
      state: type<
        NamedEntityState<Conversation, 'conversation'> & ChatState & MeUser
      >(),
      props: type<NamedEntityProps<Conversation, 'conversation'>>(),
    },
    withState<NewMessageState>(initNewMessageState),
    withMethods((store) => ({
      // Expects the conversation to already be in the store, otherwise its
      // muted state is unknown and no alert is raised.
      shouldAlertFor(message: MessageDTO): boolean {
        // A socket message can still arrive right after the store is reset.
        const me = store.me()?.user;
        const myId = me?.uid;
        if (!myId || me.chatAlertsDisabled || message.sender === myId) {
          return false;
        }

        const conversation = store.conversationEntityMap()[message.conversationId];
        return !!conversation && !conversation.alertsDisabled?.includes(myId);
      },
      setNewMessageStatus(message: MessageDTO) {
        if (store.currentUserId() === message.sender) {
          patchState(store, { messageStatus: { type: 'other' } });
        }
      },
      setDefaultNewMessageStatus() {
        patchState(store, { messageStatus: { type: 'idle' } });
      },
    })),
  );
}
