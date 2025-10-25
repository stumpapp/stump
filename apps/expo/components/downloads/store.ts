import { create } from 'zustand'

export type DownloadSortOption = 'ADDED_AT' | 'NAME' | 'SERIES'

export type DownloadSortDirection = 'ASC' | 'DESC'

export type DownloadSort = {
	option: DownloadSortOption
	direction: DownloadSortDirection
}

export type IDownloadsStore = {
	sort: DownloadSort
	setSort: (sort: DownloadSort) => void
	fetchCounter: number
	setFetchCounter: (count: number) => void
	increment: () => void
}

export const useDownloadsState = create<IDownloadsStore>((set) => ({
	// TODO: Remove this terrible thing once the drizzle bug is fixed
	fetchCounter: 0,
	setFetchCounter: (count: number) => set({ fetchCounter: count }),
	increment: () => set((state) => ({ fetchCounter: state.fetchCounter + 1 })),
	sort: { option: 'ADDED_AT', direction: 'DESC' },
	setSort: (sort: DownloadSort) => set({ sort }),
}))
