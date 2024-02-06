import { useJobContext } from '@stump/client'
import { ProgressBar, Text } from '@stump/components'
import { AnimatePresence, motion } from 'framer-motion'

export default function JobOverlay() {
	const { activeJobs } = useJobContext()

	// get the first job that is running from the activeJobs object
	const jobShown = Object.values(activeJobs).find((job) => job.status?.toLowerCase() === 'running')

	return (
		<AnimatePresence>
			{jobShown && (
				<motion.div
					className="fixed bottom-[1rem] right-[1rem] flex w-64 flex-col items-center justify-center rounded-md border border-edge-200 bg-background-300 p-2 shadow"
					initial={{ opacity: 0, scale: 0.9, y: 100 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.9, y: 100 }}
				>
					<div className="flex w-full flex-col space-y-2 p-2 text-xs">
						<Text size="sm">{jobShown.message ?? 'Job in Progress'}</Text>
						<ProgressBar
							value={
								(Number(jobShown.current_subtask_index) / Number(jobShown.subtask_queue_size)) * 100
							}
							size="sm"
							variant="primary"
						/>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
