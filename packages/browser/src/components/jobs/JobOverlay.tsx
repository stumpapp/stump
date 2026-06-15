import { useFooterOffsetStore, useJobStore } from '@stump/client'
import { ProgressBar, Text } from '@stump/components'
import { JobUpdate } from '@stump/graphql'
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
	 * The percentage value for the progress bar, calculated from task counts.
	 * Goes indeterminate until the first task_position update arrives
	 */
	const progressValue = useMemo(() => {
		if (taskCounts != null && taskCounts.total > 0) {
			const { completed, total } = taskCounts
			return (completed / total) * 100
		}
		return null
	}, [taskCounts])
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

	const additionalOffset = useFooterOffsetStore((state) => state.footerOffset)

	return (
		<AnimatePresence>
			{firstRunningJob && (
				<motion.div
					// @ts-expect-error: It does have className actually?
					className="right-4 w-72 h-28 p-4 shadow fixed z-50 flex flex-col items-start justify-between rounded-xl border border-border bg-muted"
					initial={{ opacity: 0, scale: 0.9, y: 100 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.9, y: 100 }}
					style={{
						bottom: 16 + additionalOffset,
					}}
				>
					<div className="w-full">
						<Text size="sm" className="font-medium line-clamp-2">
							{firstRunningJob.message ?? 'Job in progress'}
						</Text>
						{firstRunningJob.subtitle && (
							<Text size="xs" className="line-clamp-1 text-muted-foreground">
								{firstRunningJob.subtitle}
							</Text>
						)}
					</div>

					<div className="gap-y-2 flex w-full flex-col">
						<div className="flex w-full items-center justify-between">
							{taskCountString && <Text size="xs">{taskCountString}</Text>}
							{subTaskCounts && <Text size="xs">{subTaskCountString}</Text>}
						</div>

						<ProgressBar
							value={progressValue}
							size="sm"
							variant="primary"
							isIndeterminate={!subTaskCounts || subTaskCounts.total === 0}
						/>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}

const calcTaskCounts = ({ completedTasks, remainingTasks }: JobUpdate) => {
	if (remainingTasks == null || completedTasks == null) return null

	const total = completedTasks + remainingTasks
	return {
		completed: completedTasks,
		total,
	}
}

const calcSubTaskCounts = ({ completedSubtasks, totalSubtasks }: JobUpdate) => {
	if (totalSubtasks == null) return null
	return {
		completed: completedSubtasks ?? 0,
		total: totalSubtasks,
	}
}
