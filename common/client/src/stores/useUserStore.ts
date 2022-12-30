import { produce } from 'immer';
import create from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import type { User, UserPreferences } from '../types';
import { StoreBase } from '.';

interface UserStore extends StoreBase<UserStore> {
	user?: User | null;
	userPreferences?: UserPreferences | null;

	setUser: (user?: User | null) => void;
	setUserPreferences: (userPreferences: UserPreferences | null) => void;
}

export const useUserStore = create<UserStore>()(
	devtools(
		persist(
			(set, get) => ({
				reset() {
					set(() => ({}));
				},
				set(changes) {
					set((state) => ({ ...state, ...changes }));
				},
				setUser(user?: User | null) {
					set((state) =>
						produce(state, (draft) => {
							draft.user = user;
						}),
					);

					get().setUserPreferences(user?.user_preferences ?? null);
				},
				setUserPreferences(userPreferences: UserPreferences | null) {
					set((state) =>
						produce(state, (draft) => {
							draft.userPreferences = userPreferences;
						}),
					);
				},
			}),
			{
				name: 'stump-user-store',
				partialize(store) {
					// I really only want to persist the userPreferences. If the user is missing
					// on refresh, it will be fetched from the server. But while that fetching is
					// happening, I think the locale should be preserved (which is in userPreferences).
					return {
						userPreferences: store.userPreferences,
					};
				},
			},
		),
	),
);
