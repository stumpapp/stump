import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Box, Progress, Text } from '@chakra-ui/react';
import { useJobStore } from '@stump/client';

export default function JobOverlay() {
	const { jobs } = useJobStore();

	// FIXME: If you refresh the page RIGHT before a job completes, and miss the JobComplete event,
	// the job will be stuck in the store forever. I think instead maybe I should query the
	// database for jobs that are running, and then fetch the current info from the store here
	// as I do now. That way, when a refresh happens, the DB will be queried for jobs that are
	// running, and in this edge case the job will be set in the store accordingly.
	const jobShown = useMemo(() => {
		return Object.values(jobs).find((job) => job.status?.toLowerCase() === 'running') ?? null;
	}, [jobs]);

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
