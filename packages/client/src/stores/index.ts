export { useAppStore } from './app'
export { type EpubReaderPreferences, type EpubReaderStore, useEpubReader } from './epub'
export { useJobStore } from './job'
export { createReaderStore, useReaderStore } from './reader'
export { useUser, useUserStore } from './user'

export interface StoreBase<T extends StoreBase<T>> {
	reset(): void
	set(changes: Partial<T>): void
}
