export { createFilterStore } from './useFilterStore'
export { useStumpStore } from './useStumpStore'
export { useUser, useUserStore } from './useUserStore'

export interface StoreBase<T extends StoreBase<T>> {
	reset(): void
	set(changes: Partial<T>): void
}
