import type { User, UserPermission, UserPreferences } from '@stump/types'
import { produce } from 'immer'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import { StoreBase } from '.'

// https://github.com/cmlarsen/zustand-middleware-computed-state
interface UserStore extends StoreBase<UserStore> {
	user?: User | null
	userPreferences?: UserPreferences | null
	setUser: (user?: User | null) => void
	setUserPreferences: (userPreferences: UserPreferences | null) => void
	checkUserPermission: (permission: UserPermission) => boolean
}

// FIXME: [DEPRECATED] Use `createWithEqualityFn` instead of `create`
// TODO: consider renaming to useAuth
export const useUserStore = create<UserStore>()(
	devtools(
		persist(
			(set, get) => ({
				checkUserPermission(permission: UserPermission) {
					const user = get().user
					if (!user) return false
					return user.is_server_owner || user.permissions.includes(permission)
				},
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
							if (user?.user_preferences) {
								// NOTE: I am not killing the user preferences when a user logs out. This ensures
								// certain things like locality, theme, etc. will be lost. Nothing sensitive is
								// stored in user preferences, so I think this is fine.
								draft.userPreferences = user.user_preferences
							}
						}),
					)
				},
				setUserPreferences(userPreferences: UserPreferences | null) {
					set((state) =>
						produce(state, (draft) => {
							draft.userPreferences = userPreferences
							if (state.user) {
								draft.user = {
									...state.user,
									user_preferences: userPreferences,
								}
							}
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
