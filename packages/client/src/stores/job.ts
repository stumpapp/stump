import { JobStatus, JobUpdate } from '@stump/graphql'
import deepEqual from 'deep-equal'
import { produce } from 'immer'
import { createWithEqualityFn } from 'zustand/traditional'

type JobID = string
type JobStore = {
	jobs: Record<JobID, JobUpdate>
	addJob: (id: JobID) => void
	upsertJob: (job: JobUpdate) => void
	removeJob: (jobId: JobID) => void
}

/**
 * A store for managing job updates from the SSE eventsource
 */
export const useJobStore = createWithEqualityFn<JobStore>(
	(set) => ({
		addJob: (id) =>
			set((state) =>
				produce(state, (draft) => {
					draft.jobs[id] = { id }
				}),
			),
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
						// a patch request. The fields are: message, status, completedTasks, remainingTasks.
						// Subtasks are sent with both always included, so if they are null that means
						// they are completed and can be overwritten.
						const { status, completedTasks, remainingTasks, message, ...rest } = job

						draft.jobs[job.id] = {
							...existingJob,
							...rest,
							completedTasks: completedTasks ?? existingJob.completedTasks,
							message: message || existingJob.message,
							remainingTasks: remainingTasks ?? existingJob.remainingTasks,
							status: status || existingJob.status,
						}
					} else {
						draft.jobs[job.id] = {
							...job,
							// This should be a safe assumption, as status events will always have a set status and
							// the only time other events are sent would be updates to the job itself
							status: job.status || JobStatus.Running,
						}
					}
				}),
			)
		},
	}),
	deepEqual,
)
