import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type IDebugStore = {
	showQueryTools: boolean
	patch: (patch: Partial<Omit<IDebugStore, 'patch'>>) => void
}

export const useDebugStore = create<IDebugStore>()(
	persist(
		(set) => ({
			showQueryTools: false,
			patch: (patch) => set((state) => ({ ...state, ...patch })),
		}),
		{
			name: 'stump-debug-storage',
		},
	),
)
