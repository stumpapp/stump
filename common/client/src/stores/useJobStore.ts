import type { JobUpdate } from '../types';
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
			let job = get().jobs[newJob.runner_id];

			if (job) {
				get().updateJob(newJob);
			} else {
				set((store) =>
					produce(store, (draft) => {
						draft.jobs = {
							...store.jobs,
							[newJob.runner_id]: newJob,
						};
					}),
				);
			}
		},
		updateJob(jobUpdate: JobUpdate) {
			let jobs = get().jobs;

			let job = jobs[jobUpdate.runner_id];

			if (!job || !Object.keys(jobs).length) {
				get().addJob(jobUpdate);

				return;
			}

			const { current_task, message } = jobUpdate;

			set((store) =>
				produce(store, (draft) => {
					draft.jobs[jobUpdate.runner_id].current_task = current_task;
					draft.jobs[jobUpdate.runner_id].message = message;
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
