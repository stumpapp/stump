import { JobUpdate } from '@stump/core';
import create from 'zustand';
import { devtools } from 'zustand/middleware';
import { produce } from 'immer';
import { StoreBase } from '.';

interface JobStore extends StoreBase<JobStore> {
	jobs: Record<string, JobUpdate>;
	addJob(job: JobUpdate): void;
	updateJob(job: JobUpdate): void;
	completeJob(runnerId: string): void;
}

export const useJobStore = create<JobStore>()(
	devtools((set, get) => ({
		jobs: {},

		addJob(newJob: JobUpdate) {
			let job = get().jobs[newJob.runnerId];

			if (job) {
				get().updateJob(newJob);
			} else {
				set((store) =>
					produce(store, (draft) => {
						draft.jobs = {
							...store.jobs,
							[newJob.runnerId]: newJob,
						};
					}),
				);
			}
		},
		updateJob(jobUpdate: JobUpdate) {
			let jobs = get().jobs;

			let job = jobs[jobUpdate.runnerId];

			if (!job || !Object.keys(jobs).length) {
				get().addJob(jobUpdate);

				return;
			}

			const { currentTask, message } = jobUpdate;

			set((store) =>
				produce(store, (draft) => {
					draft.jobs[jobUpdate.runnerId].currentTask = currentTask;
					draft.jobs[jobUpdate.runnerId].message = message;
				}),
			);
		},

		// TODO: delete job? will be in DB so not really needed anymore
		completeJob(runnerId: string) {
			const job = get().jobs[runnerId];

			if (job) {
				set((store) =>
					produce(store, (draft) => {
						draft.jobs[runnerId].status = 'COMPLETED';
					}),
				);
				// set(() => ({ jobs: { ...get().jobs, [runnerId]: { ...target, status: 'COMPLETED' } } }));
			}
		},
		reset() {
			set(() => ({}));
		},
		set(changes) {
			set((state) => ({ ...state, ...changes }));
		},
	})),
);
