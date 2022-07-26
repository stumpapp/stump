import type { Job, User, UserPreferences } from '@stump/core';
import create, { GetState, SetState, StateCreator, StoreApi, UseBoundStore } from 'zustand';
import createContext from 'zustand/context';
import { devtools } from 'zustand/middleware';

interface StoreMutations {
	logoutUser(): void;
	setUser: (user: User) => void;
	setUserPreferences: (preferences: UserPreferences) => void;

	setTitle(value: string): void;

	addJob(job: Job): void;
	updateJob(job: Job): void;
	completeJob(runnerId: string): void;
}

interface MainStore extends StoreMutations {
	user: User | null;
	title: string;
	jobs: Record<string, Job>;
}

const { Provider, useStore } = createContext<MainStore>();

let store: StateCreator<MainStore, SetState<MainStore>, GetState<MainStore>> = (set, get) => ({
	user: null,

	title: 'Stump',
	jobs: {},

	logoutUser: () => {
		set({ user: null });
	},

	setUser: (user: User) => set(() => ({ user })),

	setUserPreferences: (preferences: UserPreferences) => {
		const user = get().user;

		if (user) {
			set(() => ({
				user: {
					...user,
					preferences,
				},
			}));
		}
	},

	setTitle: (value: string) => {
		if (value !== get().title) {
			set(() => ({ title: value }));
		}
	},

	addJob: (newJob: Job) => {
		let job = get().jobs[newJob.runnerId];

		if (job) {
			get().updateJob(newJob);
		} else {
			set(() => ({
				jobs: {
					...get().jobs,
					[newJob.runnerId]: newJob,
				},
			}));
		}
	},

	updateJob(jobUpdate: Job) {
		let jobs = get().jobs;

		let job = jobs[jobUpdate.runnerId];

		if (!job || !Object.keys(jobs).length) {
			get().addJob(jobUpdate);

			return;
		}

		const { currentTask, message } = jobUpdate;

		job.currentTask = currentTask;
		job.message = message;

		set(() => ({ jobs: { ...get().jobs, [jobUpdate.runnerId]: job } }));
	},

	completeJob(runnerId: string) {
		const target = get().jobs[runnerId];
		if (get().jobs[runnerId]) {
			set(() => ({ jobs: { ...get().jobs, [runnerId]: { ...target, status: 'Completed' } } }));
		}
	},
});

// if development mode, use devtools middleware to expose the zustand store
// to the redux chrome devtools extension
if (import.meta.env.NODE_ENV !== 'production') {
	store = devtools(store) as UseBoundStore<MainStore, StoreApi<MainStore>>;
}

const mainStore = create<MainStore>(store);

// const mainStore = create<MainStore>(
// 	persist(store, {
// 		name: 'stump-config',
// 		partialize: (state) => ({
// 			// userPreferences: state.userPreferences,
// 		}),
// 		getStorage: () => sessionStorage,
// 	}),
// );

let createStore = () => mainStore;

export default createStore;

export { Provider, useStore };
