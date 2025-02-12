import AsyncStorage from '@react-native-async-storage/async-storage'
import { BookPreferences } from '@stump/client'
import { useCallback, useMemo } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type GlobalSettings = BookPreferences & { incognito?: boolean }

export type ReaderStore = {
	globalSettings: GlobalSettings
	setGlobalSettings: (settings: Partial<GlobalSettings>) => void

	bookSettings: Record<string, BookPreferences>
	addBookSettings: (id: string, preferences: BookPreferences) => void
	setBookSettings: (id: string, preferences: Partial<BookPreferences>) => void

	showControls: boolean
	setShowControls: (show: boolean) => void
}

export const useReaderStore = create<ReaderStore>()(
	persist(
		(set, get) =>
			({
				globalSettings: {
					brightness: 1,
					readingDirection: 'ltr',
					imageScaling: {
						scaleToFit: 'width',
					},
					readingMode: 'paged',
				} satisfies BookPreferences,
				setGlobalSettings: (updates: Partial<GlobalSettings>) =>
					set({ globalSettings: { ...get().globalSettings, ...updates } }),

				bookSettings: {},
				addBookSettings: (id, preferences) =>
					set({ bookSettings: { ...get().bookSettings, [id]: preferences } }),
				setBookSettings: (id, updates) =>
					set({
						bookSettings: {
							...get().bookSettings,
							[id]: { ...get().bookSettings[id], ...updates },
						},
					}),

				showControls: false,
				setShowControls: (show) => set({ showControls: show }),
			}) as ReaderStore,
		{
			name: 'stump-reader-store',
			storage: createJSONStorage(() => AsyncStorage),
			version: 1,
		},
	),
)

export const useBookPreferences = (id: string) => {
	const store = useReaderStore((state) => state)

	const bookSettings = useMemo(() => store.bookSettings[id], [store.bookSettings, id])

	const setBookPreferences = useCallback(
		(updates: Partial<BookPreferences>) => {
			if (!bookSettings) {
				store.addBookSettings(id, {
					...store.globalSettings,
					...updates,
				})
			} else {
				store.setBookSettings(id, updates)
			}
		},
		[id, bookSettings, store],
	)

	return {
		preferences: {
			...(bookSettings || store.globalSettings),
			incognito: store.globalSettings.incognito,
		},
		setBookPreferences,
		updateGlobalSettings: store.setGlobalSettings,
	}
}
