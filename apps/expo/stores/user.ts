import { createUserStore } from '@stump/client'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { CachePolicy } from './reader'
import { ZustandMMKVStorage } from './store'

export const useUserStore = createUserStore(ZustandMMKVStorage)

type MobilePreferencesStore = {
	showTabLabels: boolean
	maskURLs: boolean
	setMaskURLs: (mask: boolean) => void
	storeLastRead: boolean
	reduceAnimations: boolean
	cachePolicy: CachePolicy
	allowDownscaling: boolean
	/**
	 * Patch the store with new values.
	 */
	patch: (data: Partial<MobilePreferencesStore>) => void
}

/**
 * A store for mobile-specific preferences. This should not be confused with the
 * user preferences that are stored on the server.
 */
export const usePreferencesStore = create<MobilePreferencesStore>()(
	persist(
		(set) => ({
			showTabLabels: true,
			maskURLs: false,
			setMaskURLs: (mask) => set({ maskURLs: mask }),
			storeLastRead: false,
			reduceAnimations: false,
			cachePolicy: 'memory-disk',
			allowDownscaling: true,
			patch: (data) => set(data),
		}),
		{
			name: 'stump-mobile-preferences-store',
			version: 1,
			storage: createJSONStorage(() => ZustandMMKVStorage),
		},
	),
)
