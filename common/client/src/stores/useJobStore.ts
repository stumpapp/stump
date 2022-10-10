import type { JobUpdate } from '../types';
import create from 'zustand';
import { devtools } from 'zustand/middleware';
import { produce } from 'immer';
import { StoreBase } from '.';

export const LARGE_JOB_THRESHOLDS = {
	1000: 50,
	5000: 100,
	10000: 150,
};

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

			const { current_task, message, task_count } = jobUpdate;

			// if the task_count is greater than 1000, update the store every 50 tasks
			// otherwise, update the store as is
			let curr = Number(current_task);
			let isDifferentCount = task_count !== job.task_count;
			let isLargeJob = task_count > 1000;
			// if (isLargeJob && !isDifferentCount) {
			// 	// get the threshold based on the closest key in the LARGE_JOB_THRESHOLDS object
			// 	let threshold_key = Object.keys(LARGE_JOB_THRESHOLDS).reduce((prev, curr) => {
			// 		return Math.abs(Number(curr) - Number(task_count)) <
			// 			Math.abs(Number(prev) - Number(task_count))
			// 			? curr
			// 			: prev;
			// 	});

			// 	// console.log('threshold_key', threshold_key);
			// 	let threshold =
			// 		LARGE_JOB_THRESHOLDS[Number(threshold_key) as keyof typeof LARGE_JOB_THRESHOLDS] ?? 50;
			// 	// console.log('threshold_key', threshold_key);

			// 	// if the current task is not divisible by the threshold, don't update the store
			// 	if (curr % threshold !== 0) {
			// 		return;
			// 	}
			// }

			set((store) =>
				produce(store, (draft) => {
					draft.jobs[jobUpdate.runner_id].current_task = current_task;
					draft.jobs[jobUpdate.runner_id].message = message;

					if (task_count !== store.jobs[jobUpdate.runner_id]?.task_count) {
						draft.jobs[jobUpdate.runner_id].task_count = task_count;
					}
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
