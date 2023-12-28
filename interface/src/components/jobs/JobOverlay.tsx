import { useJobContext } from '@stump/client'
import { ProgressBar, Text } from '@stump/components'
import { AnimatePresence, motion } from 'framer-motion'

export default function JobOverlay() {
	const context = useJobContext()

	if (!context) {
		throw new Error('JobContextProvider not found')
	}

	const { activeJobs } = context

	// get the first job that is running from the activeJobs object
	const jobShown = Object.values(activeJobs).find((job) => job.status?.toLowerCase() === 'running')

	function formatMessage(message?: string | null) {
		if (message?.startsWith('Analyzing')) {
			const filePieces = message
				.replace(/"/g, '')
				.split('Analyzing ')
				.filter(Boolean)[0]
				?.split('/')

			if (filePieces?.length) {
				return `Analyzing ${filePieces.slice(filePieces.length - 1).join('/')}`
			}
		}

		return message
	}

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
						<Text size="sm">{formatMessage(jobShown.message) ?? 'Job in Progress'}</Text>
						<ProgressBar
							// isIndeterminate={!jobShown.current_task || !jobShown.task_count}
							value={(Number(jobShown.current_task) / Number(jobShown.task_count)) * 100}
							size="sm"
							variant="primary"
						/>
						{jobShown.current_task != undefined && !!jobShown.task_count && (
							<Text size="xs" variant="muted">
								<>
									{jobShown.current_task} of {jobShown.task_count}
								</>
							</Text>
						)}
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
