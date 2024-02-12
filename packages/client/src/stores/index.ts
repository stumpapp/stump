import { createJSONStorage, StateStorage } from 'zustand/middleware'

export { useAppStore } from './app'
export { type EpubReaderPreferences, type EpubReaderStore, useEpubReader } from './epub'
export { useJobStore } from './job'
export { useUser, useUserStore } from './user'

export interface StoreBase<T extends StoreBase<T>> {
	reset(): void
	set(changes: Partial<T>): void
}

export let globalPersistStorage = createJSONStorage(() => globalThis.localStorage)
// FIXME: this doesn't work :sob: but I like the idea... Try and get this to work instead of the hacky localStorage file I did
export const setGlobalPersistStorage = (
	getStorage: () => StateStorage,
	options?: JsonStorageOptions | undefined,
) => {
	globalPersistStorage = createJSONStorage(getStorage, options)
}
type JsonStorageOptions = Parameters<typeof createJSONStorage>[1]
