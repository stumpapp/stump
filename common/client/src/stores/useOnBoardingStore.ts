import create from 'zustand';
import { StoreBase } from '.';

interface OnBoardingStore extends StoreBase<OnBoardingStore> {
	baseUrl?: string;
	setBaseUrl(baseUrl: string): void;
}

export const useOnBoardingStore = create<OnBoardingStore>((set) => ({
	setBaseUrl(baseUrl: string) {
		set({ baseUrl });
	},
	reset() {
		set(() => ({}));
	},
	set(changes) {
		set((state) => ({ ...state, ...changes }));
	},
}));
