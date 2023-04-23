import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import { StoreBase } from '.'

// TODO: remove this!! Just use app props context

interface StumpStore extends StoreBase<StumpStore> {
	baseUrl?: string
	connected: boolean
	setBaseUrl(baseUrl: string): void
	setConnected(connected: boolean): void
}

export const useStumpStore = create<StumpStore>()(
	devtools(
		// TODO: I am unsure the base url is something to be persisted. The only scenario
		// where it will come in unset is when running in Tauri, and in that case I might just
		// create some external store managed by the Tauri side of things that comes in
		// before the interface is loaded.
		persist(
			(set) => ({
				connected: false,
				reset() {
					set(() => ({}))
				},
				set(changes) {
					set((state) => ({ ...state, ...changes }))
				},
				setBaseUrl(baseUrl: string) {
					let adjustedBaseUrl = baseUrl

					if (baseUrl.endsWith('/')) {
						adjustedBaseUrl = baseUrl.slice(0, -1)
					}

					if (!baseUrl.endsWith('/api')) {
						adjustedBaseUrl += '/api'
					}

					set({ baseUrl: adjustedBaseUrl })
				},
				setConnected(connected: boolean) {
					set({ connected })
				},
			}),
			{
				name: 'stump-config-store',
				partialize(state) {
					return { baseUrl: state.baseUrl }
				},
			},
		),
	),
)
