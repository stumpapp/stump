import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Box, Progress, Text } from '@chakra-ui/react';
import { useJobStore } from '@stump/client';

export default function JobOverlay() {
	const { jobs } = useJobStore();

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
							isIndeterminate={jobShown.currentTask == undefined}
							value={Number(jobShown.currentTask)}
							max={Number(jobShown.taskCount)}
							rounded="md"
							w="full"
							size="xs"
							colorScheme="brand"
						/>
						{jobShown.currentTask != undefined && jobShown.taskCount != undefined && (
							<Text>
								{/* This is infuriating that I needed to do this... */}
								<>
									Task {jobShown.currentTask} of {jobShown.taskCount}
								</>
							</Text>
						)}
					</div>
				</Box>
			)}
		</AnimatePresence>
	);
}
