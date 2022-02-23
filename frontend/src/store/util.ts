import { writable } from 'svelte/store';

function createWritableStore<T>(key: string, initalValue: T) {
	const { subscribe, set } = writable<T>(initalValue);

	return {
		subscribe,
		set,
		useLocalStorage: (callback?: (current: T) => void) => {
			const json = localStorage.getItem(key);

			try {
				set(JSON.parse(json));
			} catch {
				set(json as any);
			}

			subscribe((current) => {
				callback?.(current);
				try {
					localStorage.setItem(key, JSON.stringify(current));
				} catch {
					localStorage.setItem(key, current as any);
				}
			});
		},
	};
}

export default createWritableStore;
