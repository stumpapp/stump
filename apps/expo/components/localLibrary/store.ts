import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type DownloadSortOption = 'ADDED_AT' | 'NAME' | 'SERIES'

export type DownloadSortDirection = 'ASC' | 'DESC'

export type DownloadSort = {
	option: DownloadSortOption
	direction: DownloadSortDirection
}

export type DownloadSourceFilter = 'all' | 'server' | 'imported'

export type IDownloadsStore = {
	sort: DownloadSort
	setSort: (sort: DownloadSort) => void
	sourceFilter: DownloadSourceFilter
	setSourceFilter: (filter: DownloadSourceFilter) => void
	fetchCounter: number
	setFetchCounter: (count: number) => void
	increment: () => void
}

export const useDownloadsState = create<IDownloadsStore>()(
	persist(
		(set) => ({
			// TODO: Remove this terrible thing once the drizzle bug is fixed
			fetchCounter: 0,
			setFetchCounter: (count: number) => set({ fetchCounter: count }),
			increment: () => set((state) => ({ fetchCounter: state.fetchCounter + 1 })),
			sort: { option: 'ADDED_AT', direction: 'DESC' },
			setSort: (sort: DownloadSort) => set({ sort }),
			sourceFilter: 'all',
			setSourceFilter: (filter: DownloadSourceFilter) => set({ sourceFilter: filter }),
		}),
		{
			name: 'downloads-storage',
			storage: createJSONStorage(() => AsyncStorage),
			// We only care about persisting the sort option and source filter
			partialize: (state) => ({ sort: state.sort, sourceFilter: state.sourceFilter }),
			version: 2,
		},
	),
)
