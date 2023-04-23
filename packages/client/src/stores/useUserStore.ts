import type { User, UserPreferences } from '@stump/types'
import { produce } from 'immer'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import { StoreBase } from '.'

type UserStore = {
	user?: User | null
	userPreferences?: UserPreferences | null
	setUser: (user?: User | null) => void
	setUserPreferences: (userPreferences: UserPreferences | null) => void
} & StoreBase<UserStore>

// FIXME: So this definitely was an oversight when I initially considered using Zustand for both
// react and react-native. Effectively, I need the storage backend to be dynamic, i.e. localStorage
// for react and AsyncStorage for react-native. This is possible by doing something like:
// export const useUserStore = (storageBackend) => create<UserStore>()(persist(..., { storage: createJSONStorage(() => storageBackend) })
// but would then make usage awkard: const {user} = useUserStore(localStorage)(store => ...)
// alternatively, what I could do is update the client/src/stores to more of a `create store` pattern. So this file would instead
// export:
// export const createUserStore = (storageBackend) => create<UserStore>()(persist(..., { storage: createJSONStorage(() => storageBackend) })
// and then the interface package would need `interface/src/stores/user.ts`:
// export const useUserStore = createUserStore(localStorage)
// and the mobile package would do:
// export const useUserStore = createUserStore(AsyncStorage)
// OR, just move this all to React context and manually sync with the appropriate storage backend for the
// values that need persisting (really only the preferences)...
// https://github.com/pmndrs/zustand/blob/main/docs/integrations/persisting-store-data.md#options
export const useUserStore = create<UserStore>()(
	devtools(
		persist(
			(set, get) => ({
				reset() {
					set(() => ({}))
				},
				set(changes) {
					set((state) => ({ ...state, ...changes }))
				},
				setUser(user?: User | null) {
					set((state) =>
						produce(state, (draft) => {
							draft.user = user
						}),
					)

					// NOTE: I am not killing the user preferences when a user logs out. This might
					// be 'controversial' but I think it's net postive. Otherwise, certain things
					// like locality, theme, etc. will be lost.
					if (user?.user_preferences) {
						get().setUserPreferences(user.user_preferences)
					}
				},
				setUserPreferences(userPreferences: UserPreferences | null) {
					set((state) =>
						produce(state, (draft) => {
							draft.userPreferences = userPreferences
						}),
					)
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
					}
				},
			},
		),
	),
)

export const useUser = () => useUserStore((store) => ({ setUser: store.setUser, user: store.user }))
