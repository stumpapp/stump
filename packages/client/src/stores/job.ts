import { JobUpdate } from '@stump/types'
import deepEqual from 'deep-equal'
import { produce } from 'immer'
import { createWithEqualityFn } from 'zustand/traditional'

type JobID = string
type JobStore = {
	jobs: Record<JobID, JobUpdate>
	upsertJob: (job: JobUpdate) => void
	removeJob: (jobId: JobID) => void
}

/**
 * A store for managing job updates from the SSE eventsource
 */
export const useJobStore = createWithEqualityFn<JobStore>(
	(set) => ({
		jobs: {} as Record<JobID, JobUpdate>,
		removeJob: (id) =>
			set((state) =>
				produce(state, (draft) => {
					delete draft.jobs[id]
				}),
			),
		upsertJob: (job) => {
			set((state) =>
				produce(state, (draft) => {
					const existingJob = draft.jobs[job.id]
					if (existingJob) {
						// There are certain fields which are nullable from the update that we
						// absolutely do not want to overwrite with null. It behaves similar to
						// a patch request. The fields are: message, status, completed_tasks, remaining_tasks.
						// Subtasks are sent with both always included, so if they are null that means
						// they are completed and can be overwritten.
						const { status, completed_tasks, remaining_tasks, message, ...rest } = job

						draft.jobs[job.id] = {
							...existingJob,
							...rest,
							completed_tasks: completed_tasks ?? existingJob.completed_tasks,
							message: message || existingJob.message,
							remaining_tasks: remaining_tasks ?? existingJob.remaining_tasks,
							status: status || existingJob.status,
						}
					} else {
						draft.jobs[job.id] = job
					}
				}),
			)
		},
	}),
	deepEqual,
)
