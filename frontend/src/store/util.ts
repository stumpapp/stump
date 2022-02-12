import { writable } from 'svelte/store';

const createWritableStore = (key, startValue) => {
	const { subscribe, set } = writable(startValue);

	return {
		subscribe,
		set,
		useLocalStorage: () => {
			const json = localStorage.getItem(key);

			console.log(json);

			if (json && typeof json === 'object') {
				set(JSON.parse(json));
			} else if (json) {
				set(json);
			}

			subscribe((current) => {
				if (typeof current === 'object') {
					localStorage.setItem(key, JSON.stringify(current));
				} else {
					localStorage.setItem(key, current);
				}
			});
		}
	};
};

export default createWritableStore;
