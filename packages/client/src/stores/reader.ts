import { create } from 'zustand'
import { createJSONStorage, devtools, persist, StateStorage } from 'zustand/middleware'

type ReaderMode = 'continuous' | 'paged'

type ReaderStore = {
	mode: ReaderMode
	setMode: (mode: ReaderMode) => void
	showToolBar: boolean
	setShowToolBar: (show: boolean) => void
	preloadAheadCount: number
	preloadBehindCount: number
	setPreloadAheadCount: (count: number) => void
	setPreloadBehindCount: (count: number) => void
}

export const createReaderStore = (storage?: StateStorage) =>
	create<ReaderStore>()(
		devtools(
			persist(
				(set) =>
					({
						mode: 'paged',
						preloadAheadCount: 5,
						preloadBehindCount: 3,
						setMode: (mode) => set({ mode }),
						setPreloadAheadCount: (count) => set({ preloadAheadCount: count }),
						setPreloadBehindCount: (count) => set({ preloadBehindCount: count }),
						setShowToolBar: (show) => set({ showToolBar: show }),
						showToolBar: false,
					}) as ReaderStore,
				{
					name: 'stump-reader-store',
					storage: storage ? createJSONStorage(() => storage) : undefined,
					version: 1,
				},
			),
		),
	)
