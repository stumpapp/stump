export { useJobStore } from './job'
export { type EpubReaderPreferences, type EpubReaderStore, useEpubReader } from './useEpubReader'
export { useStumpStore } from './useStumpStore'
export { useUser, useUserStore } from './useUserStore'

export interface StoreBase<T extends StoreBase<T>> {
	reset(): void
	set(changes: Partial<T>): void
}

// TODO: refactor this entire module... Old and stinky code
