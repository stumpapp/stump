import { useJobStore } from '@stump/client'
import { ProgressBar, Text } from '@stump/components'
import { JobUpdate } from '@stump/types'
import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'

// TODO: refactor this component along with the entire reporting model. It's honestly super
// confusing and poorly designed. For jobs with one task but operate primarily via subtasks,
// we will see Tasks (0/1) and x/y subtasks. I've modified it for a little bit of improvement,
// but the root issue is really the fact that we send different values:
// over-arching task count: completed_tasks, remaining_tasks
// sub-task count: completed_subtasks, total_subtasks
// The ideal would be the latter for each. This would allow us to have a more consistent
// experience and make the UI more predictable. Since internally, the task system uses a vecdeque,
// we can't just get the length of the vecdeque, so it is more effort to change this than it seems.

export default function JobOverlay() {
	const storeJobs = useJobStore((state) => state.jobs)

	// get the first job that is running from the activeJobs object
	const firstRunningJob = useMemo(
		() => Object.values(storeJobs).find((job) => job.status === 'RUNNING'),
		[storeJobs],
	)

	const subTaskCounts = useMemo(
		() => (firstRunningJob ? calcSubTaskCounts(firstRunningJob) : null),
		[firstRunningJob],
	)

	const taskCounts = useMemo(
		() => (firstRunningJob ? calcTaskCounts(firstRunningJob) : null),
		[firstRunningJob],
	)

	const progressValue = useMemo(() => {
		if (subTaskCounts != null) {
			const { completed, total } = subTaskCounts
			return (completed / total) * 100
		} else if (taskCounts != null) {
			const { completed, total } = taskCounts
			return (completed / total) * 100
		}

		return null
	}, [subTaskCounts, taskCounts])

	const taskCountString = useMemo(
		() => (taskCounts?.total ? `Tasks (${taskCounts?.completed ?? 0}/${taskCounts.total})` : null),
		[taskCounts],
	)
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
							isIndeterminate={!subTaskCounts && !taskCounts}
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
