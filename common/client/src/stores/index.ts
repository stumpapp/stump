export * from './useJobStore';
export * from './useQueryParamStore';
export * from './useStumpStore';
export * from './useTopBarStore';
export * from './useUserStore';

export interface StoreBase<T extends StoreBase<T>> {
	reset(): void;
	set(changes: Partial<T>): void;
}
