import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

type ReaderMode = 'continuous' | 'paged'

type ReaderStore = {
	mode: ReaderMode
	setMode: (mode: ReaderMode) => void
}

// storage?: StateStorage
export const createReaderStore = () =>
	create<ReaderStore>()(
		devtools(
			persist(
				(set) => ({
					mode: 'paged' as ReaderMode,
					setMode: (mode) => set({ mode }),
				}),
				{
					name: 'stump-reader-store',
					// storage: storage ? createJSONStorage(() => storage) : undefined,
				},
			),
		),
	)

export const useReaderStore = createReaderStore()
