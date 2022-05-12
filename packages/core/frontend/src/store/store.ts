import create, { GetState, SetState, StateCreator, StoreApi, UseBoundStore } from 'zustand';
import createContext from 'zustand/context';
import { devtools } from 'zustand/middleware';

interface StoreMutations {
	setUser: (user: User) => void;
	setLibraries: (libraries: Library[]) => void;
	setMedia: (media: Media[]) => void;

	setTitle(value: string): void;

	addJob(job: Job): void;
	updateJob(job: Job): void;
	completeJob(runnerId: string): void;
}

interface MainStore extends StoreMutations {
	user: User | null;
	libraries: Library[];
	// TODO: I don't think I am going to store this in the store
	media: MediaWithProgress[];

	title: string;

	jobs: Record<string, Job>;
}

const { Provider, useStore } = createContext<MainStore>();

let store: StateCreator<MainStore, SetState<MainStore>, GetState<MainStore>> = (set, get) => ({
	user: null,
	libraries: [],
	media: [],

	// libraryDrawer: false,

	title: 'Stump',

	jobs: {},

	setUser: (user: User) => set(() => ({ user })),
	setLibraries: (libraries: Library[]) => set(() => ({ libraries })),
	setMedia: (media: MediaWithProgress[]) => set(() => ({ media })),

	// setLibraryDrawer: (value) =>
	// 	set(({ libraryDrawer }) => ({
	// 		libraryDrawer: value !== undefined ? value : !libraryDrawer,
	// 	})),

	setTitle: (value: string) => {
		if (value !== get().title) {
			set(() => ({ title: value }));
		}
	},

	addJob: (job: Job) => {
		console.log('addJob', job);
		if (get().jobs[job.runnerId] == undefined) {
			set(() => ({ jobs: { ...get().jobs, [job.runnerId]: job } }));
		}
	},

	updateJob(jobUpdate: Job) {
		let job = get().jobs[jobUpdate.runnerId];

		if (job) {
			const { currentTask, message } = jobUpdate;

			job.currentTask = currentTask;
			job.message = message;

			set(() => ({ jobs: { ...get().jobs, [jobUpdate.runnerId]: job } }));
		}
	},

	completeJob(runnerId: string) {
		const target = get().jobs[runnerId];
		if (get().jobs[runnerId]) {
			set(() => ({ jobs: { ...get().jobs, [runnerId]: { ...target, status: 'Completed' } } }));

			// setTimeout(() => {
			// 	let updated = get().jobs;

			// 	delete updated[runnerId];

			// 	set(() => ({ jobs: updated }));
			// }, 1000);
		}
	},
});

// if development mode, use devtools middleware to expose the zustand store
// to the redux chrome devtools extension
if (import.meta.env.NODE_ENV !== 'production') {
	store = devtools(store) as UseBoundStore<MainStore, StoreApi<MainStore>>;
}

const mainStore = create<MainStore>(store);

let createStore = () => mainStore;

export default createStore;
export { Provider, useStore };
