import produce from 'immer';
import create from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { StoreBase } from '.';

interface StumpConfigStore extends StoreBase<StumpConfigStore> {
	baseUrl?: string;
	setBaseUrl(baseUrl: string): void;
}

export const useStumpConfigStore = create<StumpConfigStore>()(
	devtools(
		// TODO: I am unsure the base url is something to be persisted. The only scenario
		// where it will come in unset is when running in Tauri, and in that case I might just
		// create some external store managed by the Tauri side of things that comes in
		// before the interface is loaded.
		persist(
			(set) => ({
				setBaseUrl(baseUrl: string) {
					set((store) =>
						produce(store, (draft) => {
							let adjustedBaseUrl = baseUrl;

							if (baseUrl.endsWith('/')) {
								adjustedBaseUrl = baseUrl.slice(0, -1);
							}

							if (!baseUrl.endsWith('/api')) {
								adjustedBaseUrl += '/api';
							}

							draft.baseUrl = adjustedBaseUrl;
						}),
					);
				},
				reset() {
					set(() => ({}));
				},
				set(changes) {
					set((state) => ({ ...state, ...changes }));
				},
			}),
			{ name: 'stump-config-store' },
		),
	),
);
