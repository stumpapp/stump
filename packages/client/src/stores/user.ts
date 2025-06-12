import { UserPermission, UserPreferences } from '@stump/graphql'
import type { AuthUser } from '@stump/sdk'
import { produce } from 'immer'
import { create } from 'zustand'
import { createJSONStorage, devtools, persist, StateStorage } from 'zustand/middleware'

// TODO: fix this store to use the new `createWithEqualityFn` method and optimize

// https://github.com/cmlarsen/zustand-middleware-computed-state
type UserStore = {
	user?: AuthUser | null
	userPreferences?: UserPreferences | null
	setUser: (user?: AuthUser | null) => void
	setUserPreferences: (userPreferences: UserPreferences | null) => void
	checkUserPermission: (permission: UserPermission) => boolean
}

export const createUserStore = (storage?: StateStorage) =>
	create<UserStore>()(
		devtools(
			persist(
				(set, get) => ({
					checkUserPermission(permission: UserPermission) {
						const user = get().user
						if (!user) return false
						return user.isServerOwner || user.permissions.includes(permission)
					},
					reset() {
						set(() => ({}))
					},
					setUser(user?: AuthUser | null) {
						set((state) =>
							produce(state, (draft) => {
								draft.user = user
								if (user?.preferences) {
									// NOTE: I am not killing the user preferences when a user logs out. This ensures
									// certain things like locality, theme, etc. will be lost. Nothing sensitive is
									// stored in user preferences, so I think this is fine.
									draft.userPreferences = user.preferences
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
										...(userPreferences ? { preferences: userPreferences } : {}),
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
					storage: storage ? createJSONStorage(() => storage) : undefined,
				},
			),
		),
	)

export const defaultPreferences = {
	enableLiveRefetch: false,
	showQueryIndicator: false,
} as UserPreferences
