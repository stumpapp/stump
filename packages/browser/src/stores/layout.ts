import { createLayoutStore, LayoutStore } from '@stump/client'
import { useMemo } from 'react'
import { useStore } from 'zustand'

const seriesLayoutStores = new Map<string, ReturnType<typeof createLayoutStore>>()
const booksLayoutStores = new Map<string, ReturnType<typeof createLayoutStore>>()

const getSeriesLayoutStore = (key: string = 'global') => {
	const storeKey = `series-${key}`
	const existing = seriesLayoutStores.get(storeKey)
	if (existing) {
		return existing
	}

	const store = createLayoutStore({ key: storeKey, storage: localStorage })
	seriesLayoutStores.set(storeKey, store)
	return store
}

const getBooksLayoutStore = (key: string = 'global') => {
	const storeKey = `books-${key}`
	const existing = booksLayoutStores.get(storeKey)
	if (existing) {
		return existing
	}

	const store = createLayoutStore({ key: storeKey, storage: localStorage })
	booksLayoutStores.set(storeKey, store)
	return store
}

export const useSeriesLayout = <T>(key: string = 'global', selector: (state: LayoutStore) => T) => {
	const store = useMemo(() => getSeriesLayoutStore(key), [key])
	return useStore(store, selector)
}

export const useBooksLayout = <T>(key: string = 'global', selector: (state: LayoutStore) => T) => {
	const store = useMemo(() => getBooksLayoutStore(key), [key])
	return useStore(store, selector)
}
