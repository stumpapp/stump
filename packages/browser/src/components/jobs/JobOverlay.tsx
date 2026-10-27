import { useFooterOffsetStore, useJobStore } from '@stump/client'
import { ProgressBar, Text } from '@stump/components'
import { JobUpdate } from '@stump/graphql'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
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
					className="right-4 w-80 gap-3 p-4 shadow-lg fixed z-50 flex max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-border bg-popover text-popover-foreground select-none"
					role="status"
					aria-live="polite"
					// ^ TIL https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live
					initial={{ opacity: 0, y: '150%' }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: '150%' }}
					transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
					style={{
						bottom: 16 + additionalOffset,
					}}
				>
					<div className="gap-3 flex w-full items-start">
						<span className="mt-0.5 shrink-0 text-muted-foreground">
							<Loader2 className="size-4 animate-spin" aria-hidden="true" />
						</span>
						<div className="min-w-0 gap-1 flex flex-1 flex-col">
							<Text size="sm" className="font-medium line-clamp-2">
								{firstRunningJob.message ?? 'Job in progress'}
							</Text>
							{firstRunningJob.subtitle && (
								<Text size="sm" className="line-clamp-1 text-muted-foreground">
									{firstRunningJob.subtitle}
								</Text>
							)}
						</div>
						{subTaskCountString && (
							<Text size="xs" className="mt-0.5 shrink-0 text-muted-foreground tabular-nums">
								{subTaskCountString}
							</Text>
						)}
					</div>

					<div className="pl-7 w-full">
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
