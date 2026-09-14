import { useFooterOffsetStore, useJobStore } from '@stump/client'
import { ProgressBar, Text } from '@stump/components'
import { JobUpdate } from '@stump/graphql'
import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'

export default function JobOverlay() {
	const storeJobs = useJobStore((state) => state.jobs)

	/**
	 * The first running job in the store, which is used to determine the progress of the job
	 */
	const firstRunningJob = useMemo(
		() => Object.values(storeJobs).find((job) => job.status === 'RUNNING'),
		[storeJobs],
	)
	/**
	 * The subtask counts for the job, which describe individual items being processed
	 */
	const subTaskCounts = useMemo(
		() => (firstRunningJob ? calcSubTaskCounts(firstRunningJob) : null),
		[firstRunningJob],
	)

	const progressValue = useMemo(() => {
		if (subTaskCounts != null && subTaskCounts.total > 0) {
			return (subTaskCounts.completed / subTaskCounts.total) * 100
		}
		return null
	}, [subTaskCounts])

	const subTaskCountString = useMemo(
		() => (subTaskCounts?.total ? `${subTaskCounts.completed ?? 0}/${subTaskCounts.total}` : null),
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

					<div className="gap-y-1.5 flex w-full flex-col">
						{subTaskCountString && (
							<Text size="xs" className="text-muted-foreground">
								{subTaskCountString}
							</Text>
						)}

						<ProgressBar
							value={progressValue}
							size="sm"
							variant="primary"
							isIndeterminate={progressValue == null}
						/>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}

// TODO(cleanup): rename to calcTaskCounts once consolidated

const calcSubTaskCounts = ({ completedSubtasks, totalSubtasks }: JobUpdate) => {
	if (totalSubtasks == null) return null
	return {
		completed: completedSubtasks ?? 0,
		total: totalSubtasks,
	}
}
