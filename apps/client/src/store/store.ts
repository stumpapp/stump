import type { Job, Library, Locale, User, UserPreferences, ViewMode } from '@stump/core';
import create, { GetState, SetState, StateCreator, StoreApi, UseBoundStore } from 'zustand';
import createContext from 'zustand/context';
import { devtools, persist } from 'zustand/middleware';

// TODO: remove *most* of what I use zustand for. I'm happy keeping a little bit of
// it as it simplifies some of my life.

// FIXME: these will need to query the DB... which is kinda annoying lol
// unless I split userPreferences up somehow between database persisted things
// (like locale at least)
interface UserPreferencesMutations {
	// setDarkMode(darkMode: boolean): void;
	setLibraryViewMode(viewMode: ViewMode): void;
	setSeriesViewMode(viewMode: ViewMode): void;
	setCollectionViewMode(viewMode: ViewMode): void;

	setLocale(locale: Locale): void;
}

interface StoreMutations extends UserPreferencesMutations {
	logoutUser(): void;
	setUser: (user: User) => void;
	setUserAndPreferences: (user: User) => void;
	setUserPreferences: (preferences: UserPreferences) => void;
	setLibraries: (libraries: Library[]) => void;
	// setMedia: (media: Media[]) => void;

	setTitle(value: string): void;

	addJob(job: Job): void;
	updateJob(job: Job): void;
	completeJob(runnerId: string): void;
}

interface MainStore extends StoreMutations {
	user: User | null;
	userPreferences: UserPreferences | null;
	libraries: Library[];
	// // TODO: I don't think I am going to store this in the store
	// media: Media[];

	// locale: Locale;
	title: string;

	jobs: Record<string, Job>;
}

const { Provider, useStore } = createContext<MainStore>();

let store: StateCreator<MainStore, SetState<MainStore>, GetState<MainStore>> = (set, get) => ({
	user: null,
	userPreferences: null,
	libraries: [],
	// media: [],

	// locale: Locale[import.meta.env.VITE_LOCALE as keyof typeof Locale] ?? Locale.EN,

	title: 'Stump',
	jobs: {},

	logoutUser: () => {
		set({ user: null, userPreferences: null });
	},

	setUser: (user: User) => set(() => ({ user })),

	setUserAndPreferences: (user: User) => {
		if (!user.preferences) {
			get().setUser(user);
		} else {
			set(() => ({ user, userPreferences: user.preferences! }));
		}
	},

	setUserPreferences: (preferences: UserPreferences) =>
		set(() => ({
			userPreferences: preferences,
		})),

	setLibraryViewMode: (viewMode: ViewMode) => {
		let userPreferences = get().userPreferences;

		if (userPreferences) {
			set(() => ({
				userPreferences: {
					...userPreferences,
					libraryViewMode: viewMode,
				} as UserPreferences,
			}));
		}
	},
	setSeriesViewMode: (viewMode: ViewMode) => {
		let userPreferences = get().userPreferences;

		if (userPreferences) {
			set(() => ({
				userPreferences: {
					...userPreferences,
					seriesViewMode: viewMode,
				} as UserPreferences,
			}));
		}
	},
	setCollectionViewMode: (viewMode: ViewMode) => {
		let userPreferences = get().userPreferences;

		if (userPreferences) {
			set(() => ({
				userPreferences: {
					...userPreferences,
					collectionViewMode: viewMode,
				} as UserPreferences,
			}));
		}
	},

	setLocale: (locale) => {
		let userPreferences = get().userPreferences;

		if (userPreferences) {
			set(() => ({
				userPreferences: {
					...userPreferences,
					locale,
				} as UserPreferences,
			}));
		}
	},

	setLibraries: (libraries: Library[]) => set(() => ({ libraries })),
	// setMedia: (media: Media[]) => set(() => ({ media })),

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

// const mainStore = create<MainStore>(store);

const mainStore = create<MainStore>(
	persist(store, {
		name: 'stump-config',
		partialize: (state) => ({
			userPreferences: state.userPreferences,
		}),
		getStorage: () => sessionStorage,
	}),
);

let createStore = () => mainStore;

export default createStore;
export { Provider, useStore };
