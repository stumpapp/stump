export { useAppStore } from './app'
export { type EpubReaderPreferences, type EpubReaderStore, useEpubReader } from './epub'
export { useJobStore } from './job'
export { setUserStorage, useUser, useUserStore } from './user'

export interface StoreBase<T extends StoreBase<T>> {
	reset(): void
	set(changes: Partial<T>): void
}

export { createJSONStorage, StateStorage } from 'zustand/middleware'
