import { createUserStore } from '@stump/client'
import merge from 'lodash/merge'
import { create } from 'zustand'
import { createJSONStorage } from 'zustand/middleware'
import { persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

export const useUserStore = createUserStore(localStorage)
export const useUser = () =>
	useUserStore(useShallow((store) => ({ setUser: store.setUser, user: store.user })))

type LocalPreferences = {
	sidebar: {
		side?: 'left' | 'right'
		variant?: 'sidebar' | 'floating' | 'inset'
		collapsible?: 'offcanvas' | 'icon' | 'none'
	}
}

type LocalPreferencesStore = {
	patch(partial: Partial<LocalPreferences>): void
} & LocalPreferences

export const useLocalPreferencesStore = create<LocalPreferencesStore>()(
	persist(
		(set, get) =>
			({
				sidebar: {
					side: 'left',
					variant: 'sidebar',
					collapsible: 'offcanvas',
				},
				patch: (partial) => {
					set({
						...merge({}, get(), partial),
					})
				},
			}) satisfies LocalPreferencesStore,
		{ name: 'stump-local-preferences', storage: createJSONStorage(() => localStorage) },
	),
)
