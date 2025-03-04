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
	storeLastRead: boolean
	setStoreLastRead: (shouldStore: boolean) => void
}

/**
 * A store for mobile-specific preferences. This should not be confused with the
 * user preferences that are stored on the server.
 */
export const usePreferencesStore = create<MobilePreferencesStore>()(
	persist(
		(set) => ({
			setShowTabLabels: (show) => set({ showTabLabels: show }),
			showTabLabels: false,
			setMaskURLs: (mask) => set({ maskURLs: mask }),
			maskURLs: false,
			storeLastRead: false,
			setStoreLastRead: (shouldStore) => set({ storeLastRead: shouldStore }),
		}),
		{
			name: 'stump-mobile-preferences-store',
			version: 1,
			storage: createJSONStorage(() => AsyncStorage),
		},
	),
)
