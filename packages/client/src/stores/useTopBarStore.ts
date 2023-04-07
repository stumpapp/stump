import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import { StoreBase } from '.'

export interface TopBarStore extends StoreBase<TopBarStore> {
	title?: string
	setTitle(title?: string): void
}

export const useTopBarStore = create<TopBarStore>()(
	devtools((set) => ({
		reset() {
			set(() => ({}))
		},
		set(changes) {
			set((state) => ({ ...state, ...changes }))
		},
		setTitle(title) {
			set((store) => ({ ...store, title }))
		},
	})),
)
