import { useJobStore } from '@stump/client'
import { ProgressBar, Text } from '@stump/components'
import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'

export default function JobOverlay() {
	const storeJobs = useJobStore((state) => state.jobs)

	// get the first job that is running from the activeJobs object
	const firstRunningJob = useMemo(
		() => Object.values(storeJobs).find((job) => job.status === 'RUNNING'),
		[storeJobs],
	)

	const getSubTaskCounts = () => {
		if (!firstRunningJob) return null

		const { completed_subtasks, remaining_subtasks } = firstRunningJob
		if (remaining_subtasks != null && remaining_subtasks > 0) {
			return getCounts(completed_subtasks, remaining_subtasks)
		} else {
			return null
		}
	}
	const subTaskCounts = useMemo(getSubTaskCounts, [firstRunningJob])

	const getTaskCounts = () => {
		if (!firstRunningJob) return null

		const { completed_tasks, remaining_tasks } = firstRunningJob
		if (remaining_tasks != null && remaining_tasks >= 0) {
			return getCounts(completed_tasks, remaining_tasks)
		} else {
			return null
		}
	}
	const taskCounts = useMemo(getTaskCounts, [firstRunningJob])

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

	const renderTaskCounts = () => `${taskCounts?.completed ?? 0}/${taskCounts?.total ?? 0}`
	const renderSubTaskCounts = () => `${subTaskCounts?.completed ?? 0}/${subTaskCounts?.total ?? 0}`

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
							<Text size="xs">Tasks ({renderTaskCounts()})</Text>
							{subTaskCounts && <Text size="xs">{renderSubTaskCounts()}</Text>}
						</div>
						<ProgressBar value={progressValue} size="sm" variant="primary" />
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}

type TaskCount = {
	completed: number
	total: number
}
const getCounts = (completed: number | null, remaining: number | null): TaskCount => {
	const total = (completed ?? 0) + (remaining ?? 0)
	return {
		completed: completed ?? 0,
		total,
	}
}
