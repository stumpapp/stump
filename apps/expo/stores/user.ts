import { createUserStore } from '@stump/client'
import type { AllowedLocale } from '@stump/i18n'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { ThumbnailPlaceholderType } from '~/components/image/ThumbnailPlaceholder'

import { CachePolicy } from './reader'
import { ZustandMMKVStorage } from './store'

export const useUserStore = createUserStore(ZustandMMKVStorage)

export type ListLayout = 'grid' | 'list'

type MobilePreferencesStore = {
	showTabLabels: boolean
	maskURLs: boolean
	setMaskURLs: (mask: boolean) => void
	storeLastRead: boolean
	reduceAnimations: boolean
	cachePolicy: CachePolicy
	allowDownscaling: boolean
	thumbnailRatio: number
	thumbnailPlaceholder: ThumbnailPlaceholderType
	performanceMonitor: boolean
	accentColor?: string | undefined
	showCuratedDownloads?: boolean | undefined
	preferNativePdf?: boolean | undefined
	disableDismissGesture: boolean
	autoSyncLocalData: boolean
	locale: AllowedLocale | undefined
	opdsLayout: ListLayout
	smartListLayout: ListLayout
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
			thumbnailRatio: 2 / 3,
			thumbnailPlaceholder: 'grayscale',
			accentColor: undefined,
			performanceMonitor: false,
			showCuratedDownloads: true,
			preferNativePdf: false,
			disableDismissGesture: false,
			autoSyncLocalData: true,
			// Note: I default to undefined so the localization library can determine a default
			locale: undefined,
			opdsLayout: 'grid',
			smartListLayout: 'grid',
			patch: (data) => set(data),
		}),
		{
			name: 'stump-mobile-preferences-store',
			version: 1,
			storage: createJSONStorage(() => ZustandMMKVStorage),
		},
	),
)
