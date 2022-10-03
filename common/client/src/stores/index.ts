export * from './useStumpStore';
export * from './useUserStore';
export * from './useJobStore';
export * from './useQueryParamStore';
export * from './useTopBarStore';

export interface StoreBase<T extends StoreBase<T>> {
	reset(): void;
	set(changes: Partial<T>): void;
}
