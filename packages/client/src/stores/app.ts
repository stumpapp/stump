import { create } from 'zustand'
import { createJSONStorage, devtools, persist, StateStorage } from 'zustand/middleware'

import { Platform } from '../context'

type AppStore = {
	platform: Platform
	setPlatform: (platform: Platform) => void
	baseUrl?: string
	setBaseUrl: (baseUrl: string) => void
	isConnectedWithServer: boolean
	setIsConnectedWithServer: (isConnected: boolean) => void
	showConfetti?: boolean
	setShowConfetti: (show: boolean) => void
}

export const createAppStore = (storage?: StateStorage) =>
	create<AppStore>()(
		devtools(
			persist(
				(set) => ({
					isConnectedWithServer: false,
					platform: 'unknown',
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
					setIsConnectedWithServer(connected: boolean) {
						set({
							isConnectedWithServer: connected,
						})
					},
					setPlatform(platform: Platform) {
						set({ platform })
					},
					setShowConfetti(show) {
						set({ showConfetti: show })
					},
					showConfetti: false,
				}),
				{
					name: 'stump-main-store',
					partialize(state) {
						return { baseUrl: state.baseUrl, platform: state.platform }
					},
					storage: storage ? createJSONStorage(() => storage) : undefined,
				},
			),
		),
	)
