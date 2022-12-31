import create from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import { StoreBase } from '.'

type LayoutStore = StoreBase<LayoutStore>

export const useLayoutStore = create<LayoutStore>()(
	devtools(
		persist(
			(set) => ({
				reset() {
					set(() => ({}))
				},
				set(changes) {
					set((state) => ({ ...state, ...changes }))
				},
			}),
			{ name: 'stump-layout-store' },
		),
	),
)
