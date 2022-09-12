export * from './useStumpConfigStore';
export * from './useUserStore';

export interface StoreBase<T extends StoreBase<T>> {
	reset(): void;
	set(changes: Partial<T>): void;
}
