import createWritableStore from './util';

export interface Preferences {
	darkMode: boolean;
}

const initalState: Preferences = {
	darkMode: true,
};

export const preferences = createWritableStore<Preferences>('preferences', initalState);
