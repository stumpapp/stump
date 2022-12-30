import create from 'zustand';
import { devtools } from 'zustand/middleware';

import { StoreBase } from '.';

export interface TopBarStore extends StoreBase<TopBarStore> {
	title?: string;
	backwardsUrl?: string | number;
	forwardsUrl?: string | number;

	setTitle(title?: string): void;
	setBackwardsUrl(backwardsUrl?: string | number): void;
	setForwardsUrl(forwardsUrl?: string | number): void;
}

export const useTopBarStore = create<TopBarStore>()(
	devtools((set) => ({
		reset() {
			set(() => ({}));
		},
		set(changes) {
			set((state) => ({ ...state, ...changes }));
		},
		setBackwardsUrl(backwardsUrl) {
			set((store) => ({ ...store, backwardsUrl }));
		},
		setForwardsUrl(forwardsUrl) {
			set((store) => ({ ...store, forwardsUrl }));
		},
		setTitle(title) {
			set((store) => ({ ...store, title }));
		},
	})),
);
