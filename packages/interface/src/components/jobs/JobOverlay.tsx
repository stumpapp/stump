import { Box, Progress, Text } from '@chakra-ui/react'
import { useJobContext } from '@stump/client'
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
				<Box
					as={motion.div}
					bg={'white'}
					_dark={{ bg: 'gray.700' }}
					className="fixed right-[1rem] bottom-[1rem] flex w-52 flex-col items-center justify-center rounded-md p-2 shadow"
					initial={{ opacity: 0, scale: 0.9, y: 100 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.9, y: 100 }}
				>
					<div className="flex w-full flex-col space-y-2 p-2 text-xs">
						<Text fontWeight="medium">{formatMessage(jobShown.message) ?? 'Job in Progress'}</Text>
						<Progress
							isIndeterminate={!jobShown.current_task || !jobShown.task_count}
							value={Number(jobShown.current_task)}
							max={Number(jobShown.task_count)}
							rounded="md"
							w="full"
							size="xs"
							colorScheme="brand"
						/>
						{jobShown.current_task != undefined && !!jobShown.task_count && (
							<Text>
								<>
									Task {jobShown.current_task} of {jobShown.task_count}
								</>
							</Text>
						)}
					</div>
				</Box>
			)}
		</AnimatePresence>
	)
}
