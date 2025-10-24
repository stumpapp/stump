import { create } from 'zustand'

export type IDownloadsStore = {
	fetchCounter: number
	setFetchCounter: (count: number) => void
	increment: () => void
}

// TODO: Remove this terrible thing once the drizzle bug is fixed
export const useDownloadsFetcherStore = create<IDownloadsStore>((set) => ({
	fetchCounter: 0,
	setFetchCounter: (count: number) => set({ fetchCounter: count }),
	increment: () => set((state) => ({ fetchCounter: state.fetchCounter + 1 })),
}))
