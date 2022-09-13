export * from './useStumpConfigStore';
export * from './useUserStore';
export * from './useJobStore';

export interface StoreBase<T extends StoreBase<T>> {
	reset(): void;
	set(changes: Partial<T>): void;
}
