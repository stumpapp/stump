import create, { GetState, SetState, StateCreator, StoreApi, UseBoundStore } from 'zustand';
import createContext from 'zustand/context';
import { devtools } from 'zustand/middleware';

interface StoreMutations {
	setUser: (user: User) => void;
	setLibraries: (libraries: Library[]) => void;
	setMedia: (media: Media[]) => void;
}

interface MainStore extends StoreMutations {
	user: User | null;
	libraries: Library[];
	// TODO: I don't think I am going to store this in the store
	media: MediaWithProgress[];
}

const { Provider, useStore } = createContext<MainStore>();

let store: StateCreator<MainStore, SetState<MainStore>, GetState<MainStore>> = (set, get) => ({
	user: null,
	libraries: [],
	media: [],

	setUser: (user: User) => set(() => ({ user })),
	setLibraries: (libraries: Library[]) => set(() => ({ libraries })),
	setMedia: (media: MediaWithProgress[]) => set(() => ({ media })),
});

// if development mode, use devtools middleware to expose the zustand store
// to the redux chrome devtools extension
if (import.meta.env.NODE_ENV !== 'production') {
	store = devtools(store) as UseBoundStore<MainStore, StoreApi<MainStore>>;
}

const mainStore = create<MainStore>(store);

let createMainStore = () => mainStore;

export default createMainStore;
export { Provider, useStore as useMainStore };
