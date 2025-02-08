import AsyncStorage from '@react-native-async-storage/async-storage'
import { createUserStore } from '@stump/client'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export const useUserStore = createUserStore(AsyncStorage)

type MobilePreferencesStore = {
	showTabLabels: boolean
	setShowTabLabels: (show: boolean) => void
	maskURLs: boolean
	setMaskURLs: (mask: boolean) => void
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
			setShowTabLabels: (show) => set({ showTabLabels: show }),
			showTabLabels: false,
			setMaskURLs: (mask) => set({ maskURLs: mask }),
			maskURLs: false,
		}),
		{
			name: 'stump-mobile-preferences-store',
			version: 1,
			storage: createJSONStorage(() => AsyncStorage),
		},
	),
)
