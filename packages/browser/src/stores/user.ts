import { createUserStore } from '@stump/client'
import merge from 'lodash/merge'
import { create } from 'zustand'
import { createJSONStorage } from 'zustand/middleware'
import { persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

export const useUserStore = createUserStore(localStorage)
export const useUser = () =>
	useUserStore(useShallow((store) => ({ setUser: store.setUser, user: store.user })))

export type TextCase = 'lowerCase' | 'sentenceCase' | 'titleCase'

type LocalPreferences = {
	sidebar: {
		side?: 'left' | 'right'
		variant?: 'sidebar' | 'floating' | 'inset'
		collapsible?: 'offcanvas' | 'icon' | 'none'
	}
	textCase: TextCase
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
				textCase: 'sentenceCase',
				patch: (partial) => {
					set({
						...merge({}, get(), partial),
					})
				},
			}) satisfies LocalPreferencesStore,
		{ name: 'stump-local-preferences', storage: createJSONStorage(() => localStorage) },
	),
)
