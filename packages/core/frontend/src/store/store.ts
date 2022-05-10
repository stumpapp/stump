import create, { GetState, SetState, StateCreator, StoreApi, UseBoundStore } from 'zustand';
import createContext from 'zustand/context';
import { devtools, persist } from 'zustand/middleware';

interface StoreMutations {
	setUser: (user: User) => void;
	setLibraries: (libraries: Library[]) => void;
	setMedia: (media: Media[]) => void;

	setLibraryDrawer(value?: boolean): void;

	setTitle(value: string): void;
}

interface MainStore extends StoreMutations {
	user: User | null;
	libraries: Library[];
	// TODO: I don't think I am going to store this in the store
	media: MediaWithProgress[];

	libraryDrawer: boolean;

	title: string;
}

const { Provider, useStore } = createContext<MainStore>();

let store: StateCreator<MainStore, SetState<MainStore>, GetState<MainStore>> = (set, get) => ({
	user: null,
	libraries: [],
	media: [],

	libraryDrawer: false,

	title: 'Stump',

	setUser: (user: User) => set(() => ({ user })),
	setLibraries: (libraries: Library[]) => set(() => ({ libraries })),
	setMedia: (media: MediaWithProgress[]) => set(() => ({ media })),

	setLibraryDrawer: (value) =>
		set(({ libraryDrawer }) => ({
			libraryDrawer: value !== undefined ? value : !libraryDrawer,
		})),

	setTitle: (value: string) => set(() => ({ title: value })),
});

// if development mode, use devtools middleware to expose the zustand store
// to the redux chrome devtools extension
if (import.meta.env.NODE_ENV !== 'production') {
	store = devtools(store) as UseBoundStore<MainStore, StoreApi<MainStore>>;
}

const mainStore = create<MainStore>(
	persist(store, {
		name: 'stump-config',
		partialize: (state) => ({ libraryDrawer: state.libraryDrawer }),
		getStorage: () => sessionStorage,
	}),
);

let createStore = () => mainStore;

export default createStore;
export { Provider, useStore };
