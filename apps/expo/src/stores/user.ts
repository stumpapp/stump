import AsyncStorage from '@react-native-async-storage/async-storage'
import { createUserStore } from '@stump/client'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export const useUserStore = createUserStore(AsyncStorage)

type MobilePreferencesStore = {
	show_tab_names: boolean
	setShowTabNames: (show: boolean) => void
}

/**
 * A store for mobile-specific preferences. This should not be confused with the
 * user preferences that are stored on the server.
 *
 * TODO: Merge this with the server UserPreferences as optional fields?
 */
export const usePreferencesStore = create<MobilePreferencesStore>()(
	persist(
		(set) => ({
			setShowTabNames: (show) => set({ show_tab_names: show }),
			show_tab_names: false,
		}),
		{
			name: 'stump-mobile-preferences-store',
			storage: createJSONStorage(() => AsyncStorage),
		},
	),
)
