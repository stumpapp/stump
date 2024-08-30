import { useJobStore } from '@stump/client'
import { ProgressBar, Text } from '@stump/components'
import { JobUpdate } from '@stump/types'
import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'

export default function JobOverlay() {
	const storeJobs = useJobStore((state) => state.jobs)

	/**
	 * The first running job in the store, which is used to determine the progress of the job.
	 */
	const firstRunningJob = useMemo(
		() => Object.values(storeJobs).find((job) => job.status === 'RUNNING'),
		[storeJobs],
	)
	/**
	 * The subtask counts for the job, which describe the smaller units of work that are
	 * being done within the job. This is more indicative of the actual work being done
	 */
	const subTaskCounts = useMemo(
		() => (firstRunningJob ? calcSubTaskCounts(firstRunningJob) : null),
		[firstRunningJob],
	)
	/**
	 * The task counts for the job, which describe the overarching tasks for the main
	 * job. This doesn't relate to smaller units of work, but rather the larger tasks
	 * which encompass multiple subtasks.
	 */
	const taskCounts = useMemo(
		() => (firstRunningJob ? calcTaskCounts(firstRunningJob) : null),
		[firstRunningJob],
	)

	/**
	 * The percentage value for the progress bar, calculated from the subtask counts.
	 * Note that we don't care about the task counts here, as the subtask counts are more
	 * indicative of actual work being done.
	 */
	const progressValue = useMemo(() => {
		if (subTaskCounts != null) {
			const { completed, total } = subTaskCounts
			return (completed / total) * 100
		}
		return null
	}, [subTaskCounts])
	/**
	 * The string representation of the task counts, which is used to display the total, overarching
	 * tasks that are being done in the job.
	 */
	const taskCountString = useMemo(
		() => (taskCounts?.total ? `Tasks (${taskCounts?.completed ?? 0}/${taskCounts.total})` : null),
		[taskCounts],
	)
	/**
	 * The string representation of the subtask counts, which is used to display the total, smaller
	 * units of work that are being done in the job.
	 */
	const subTaskCountString = useMemo(
		() => (subTaskCounts?.total ? `${subTaskCounts?.completed ?? 0}/${subTaskCounts.total}` : null),
		[subTaskCounts],
	)

	return (
		<AnimatePresence>
			{firstRunningJob && (
				<motion.div
					className="fixed bottom-[1rem] right-[1rem] flex h-28 w-64 flex-col items-start justify-between rounded-md border border-edge-subtle bg-background-surface p-4 shadow"
					initial={{ opacity: 0, scale: 0.9, y: 100 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.9, y: 100 }}
				>
					<Text size="sm" className="line-clamp-2">
						{firstRunningJob.message ?? 'Job in Progress'}
					</Text>

					<div className="flex w-full flex-col gap-y-2">
						<div className="flex w-full items-center justify-between">
							{taskCountString && <Text size="xs">{taskCountString}</Text>}
							{subTaskCounts && <Text size="xs">{subTaskCountString}</Text>}
						</div>

						<ProgressBar
							value={progressValue}
							size="sm"
							variant="primary"
							isIndeterminate={!subTaskCounts}
						/>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}

const calcTaskCounts = ({ completed_tasks, remaining_tasks }: JobUpdate) => {
	if (remaining_tasks == null || !completed_tasks) return null

	const total = (completed_tasks ?? 0) + (remaining_tasks ?? 0)
	return {
		completed: completed_tasks ?? 0,
		total,
	}
}

const calcSubTaskCounts = ({ completed_subtasks, total_subtasks }: JobUpdate) => {
	if (total_subtasks == null) return null
	return {
		completed: completed_subtasks ?? 0,
		total: total_subtasks,
	}
}
