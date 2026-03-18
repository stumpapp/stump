import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { useActiveServer } from '~/components/activeServer'

import { ZustandMMKVStorage } from './store'

// Note: Not used to cap favorites
const MAX_HISTORY_PER_SERVER = 10

export type SearchRecord = {
	query: string
	serverId: string
}

// Note: I didn't bother to key to the server since I don't really expect folks
// to favorite more than a few and I cap the history per server. Idk, lazy won here
// but if we need to refactor for efficiency it wouldn't be a huge deal
export type SearchStore = {
	searchHistory: SearchRecord[]
	favoriteSearches: SearchRecord[]
	trackSearch: (query: string, serverId: string) => void
	favoriteSearch: (query: string, serverId: string) => void
	unfavoriteSearch: (query: string, serverId: string) => void
	clearSearchHistory: (serverId: string) => void
	removeFromHistory: (query: string, serverId: string) => void
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
					].slice(0, MAX_HISTORY_PER_SERVER),
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
			unfavoriteSearch: (query, serverId) => {
				set((state) => ({
					favoriteSearches: state.favoriteSearches.filter(
						(record) => !(record.query === query && record.serverId === serverId),
					),
				}))
			},
			clearSearchHistory: (serverId) => {
				set((state) => ({
					searchHistory: state.searchHistory.filter((record) => record.serverId !== serverId),
				}))
			},
			removeFromHistory: (query, serverId) => {
				set((state) => ({
					searchHistory: state.searchHistory.filter(
						(record) => !(record.query === query && record.serverId === serverId),
					),
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

export function useCuratedSearch() {
	const {
		activeServer: { id: serverId },
	} = useActiveServer()
	const curatedSearches = useSearchStore((state) => ({
		searchHistory: state.searchHistory.filter((record) => record.serverId === serverId),
		favoriteSearches: state.favoriteSearches.filter((record) => record.serverId === serverId),
	}))
	return curatedSearches
}
