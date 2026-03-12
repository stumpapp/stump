import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { ZustandMMKVStorage } from './store'
import { useActiveServer } from '~/components/activeServer'

export type SearchRecord = {
	query: string
	serverId: string
}

export type SearchStore = {
	searchHistory: SearchRecord[]
	favoriteSearches: SearchRecord[]
	trackSearch: (query: string, serverId: string) => void
	favoriteSearch: (query: string, serverId: string) => void
}

export const useSearchStore = create<SearchStore>()(
	persist(
		(set) => ({
			searchHistory: [],
			favoriteSearches: [],
			trackSearch: (query, serverId) => {
				const newRecord = { query, serverId }
				set((state) => ({
					searchHistory: [
						newRecord,
						...state.searchHistory.filter(
							(record) => !(record.query === query && record.serverId === serverId),
						),
					],
				}))
			},
			favoriteSearch: (query, serverId) => {
				const newRecord = { query, serverId }
				set((state) => ({
					favoriteSearches: [
						newRecord,
						...state.favoriteSearches.filter(
							(record) => !(record.query === query && record.serverId === serverId),
						),
					],
				}))
			},
		}),
		{
			name: 'search-store',
			storage: createJSONStorage(() => ZustandMMKVStorage),
			version: 1,
		},
	),
)

export function useSearchHistory() {
	const {
		activeServer: { id: serverId },
	} = useActiveServer()
	const searchHistory = useSearchStore((state) =>
		state.searchHistory.filter((record) => record.serverId === serverId),
	)
	return searchHistory
}

export function useFavoriteSearches() {
	const {
		activeServer: { id: serverId },
	} = useActiveServer()
	const favoriteSearches = useSearchStore((state) =>
		state.favoriteSearches.filter((record) => record.serverId === serverId),
	)
	return favoriteSearches
}
