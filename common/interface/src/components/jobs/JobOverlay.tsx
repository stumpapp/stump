import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Box, Progress, Text } from '@chakra-ui/react';
import { useJobContext } from '@stump/client';

export default function JobOverlay() {
	const context = useJobContext();

	if (!context) {
		throw new Error('JobContextProvider not found');
	}

	const { activeJobs } = context;

	// get the first job that is running from the activeJobs object
	const jobShown = Object.values(activeJobs).find((job) => job.status?.toLowerCase() === 'running');

	function formatMessage(message?: string | null) {
		if (message?.startsWith('Analyzing')) {
			let filePieces = message.replace(/"/g, '').split('Analyzing ').filter(Boolean)[0].split('/');

			return `Analyzing ${filePieces.slice(filePieces.length - 1).join('/')}`;
		}

		return message;
	}

	return (
		<AnimatePresence>
			{jobShown && (
				<Box
					as={motion.div}
					bg={'white'}
					_dark={{ bg: 'gray.700' }}
					className="fixed right-[1rem] bottom-[1rem] rounded-md shadow p-2 flex flex-col justify-center items-center w-52"
					initial={{ opacity: 0, y: 100, scale: 0.9 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					exit={{ opacity: 0, y: 100, scale: 0.9 }}
				>
					<div className="flex flex-col space-y-2 p-2 w-full text-xs">
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
	);
}
