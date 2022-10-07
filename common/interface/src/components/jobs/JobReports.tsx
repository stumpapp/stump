import { useEffect, useMemo, useState } from 'react';

import {
	Box,
	Heading,
	HStack,
	Progress,
	Stack,
	Text,
	useColorModeValue,
	VStack,
} from '@chakra-ui/react';
import { JobUpdate, useJobStore } from '@stump/client';

import type { JobReport } from '@stump/client';
import Button from '../../ui/Button';
import toast from 'react-hot-toast';
// TODO: ORGANIZE BETTER

function EmptyState({ message }: { message: string }) {
	return (
		<Text color={useColorModeValue('gray.600', 'gray.400')} fontSize="sm">
			{message}
		</Text>
	);
}

function JobReportComponent(jobReport: JobReport) {
	return (
		<VStack align="start" spacing={2}>
			<HStack spacing={3}>
				<Text>{jobReport.kind}</Text>
				<Text color={useColorModeValue('gray.600', 'gray.400')} fontSize="xs" className="italic">
					{jobReport.details}
				</Text>
			</HStack>

			{/* FIXME: don't do this lol this was for my own debug purposes and shouldn't stay like this.
				I need to design a better way to display this information. */}
			<Box as="pre" bg={useColorModeValue('whiteAlpha.600', 'blackAlpha.300')} rounded="md" p={1.5}>
				{JSON.stringify({ ...jobReport, details: undefined, status: undefined }, null, 2)}
			</Box>
		</VStack>
	);
}

export function RunningJobs({ jobReports }: { jobReports: JobReport[] }) {
	interface Test extends JobReport, Omit<JobUpdate, 'status' | 'task_count'> {}

	const [fakeJob, setFakeJob] = useState<Test>();
	const [startedAt, setStartedAt] = useState<number>();

	useEffect(() => {
		setTimeout(() => {
			setFakeJob({
				id: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
				kind: 'LibraryScan',
				details: '/Users/aaronleopold/Documents/Stump/Comics',
				task_count: 1024,
				status: 'RUNNING',
				completed_task_count: 0,
				ms_elapsed: null,
				completed_at: null,
				current_task: 0 as any,
				message: 'Job started',
				runner_id: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
			});

			setStartedAt(Date.now());
		}, 3000);
	}, []);

	function readableKind(kind: string | null) {
		if (!kind) {
			return 'Unknown';
		}

		return kind.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
	}

	// set an interval when a job is running to increment the completed task count
	// by 1 every 100ms
	useEffect(() => {
		if (!fakeJob) {
			return;
		}

		const interval = setInterval(() => {
			setFakeJob((prev) => {
				if (!prev) {
					return prev;
				}

				let curr = Number(prev.current_task || 0) + 1;

				return {
					...prev,
					current_task: curr as any,
					message: `Working on task ${curr}`,
				};
			});
		}, 100);

		return () => clearInterval(interval);
	}, [fakeJob]);

	return (
		<Stack>
			<Heading alignSelf="start" size="md">
				Active Job
			</Heading>

			{!fakeJob && <EmptyState message="No jobs are currently running" />}

			{fakeJob && (
				<VStack
					align="start"
					spacing={2}
					bg={useColorModeValue('whiteAlpha.600', 'blackAlpha.300')}
					rounded="md"
					p={3}
				>
					<div className="w-full flex justify-between items-center">
						<div className="flex space-x-3 items-center">
							<Text fontSize="sm" fontWeight="semibold">
								{readableKind(fakeJob.kind)}
							</Text>
							<Text
								color={useColorModeValue('gray.600', 'gray.400')}
								fontSize="xs"
								className="italic"
							>
								{fakeJob.details}
							</Text>
						</div>
						<Button size="xs" onClick={() => toast.error('Unimplemented')}>
							Cancel Job
						</Button>
					</div>

					<div className="flex flex-col space-y-2 w-full text-xs">
						<Text fontWeight="medium">{fakeJob.message}</Text>
						<div className="flex items-center space-x-2">
							<Progress
								value={Number(fakeJob.current_task)}
								max={Number(fakeJob.task_count)}
								rounded="md"
								w="full"
								size="xs"
								colorScheme="brand"
							/>

							<Text fontSize="xs" className="min-w-fit">
								<>
									{fakeJob.current_task} / {fakeJob.task_count}
								</>
							</Text>
						</div>
					</div>
				</VStack>
			)}
		</Stack>
	);
	// const { jobs: zustandJobs } = useJobStore();

	// const runningJobs = useMemo(() => {
	// 	return jobReports
	// 		.filter((job) => job.status === 'RUNNING' && job.id && zustandJobs[job.id])
	// 		.map((job) => ({ ...job, ...zustandJobs[job.id!] }));
	// }, [zustandJobs, jobReports]);

	// // TODO: generalize this since I use it in other places
	// // FIXME: this isn't a safe operation
	// function trim(message?: string | null) {
	// 	if (message?.startsWith('Analyzing')) {
	// 		let filePieces = message.replace(/"/g, '').split('Analyzing ').filter(Boolean)[0].split('/');

	// 		return `Analyzing ${filePieces.slice(filePieces.length - 1).join('/')}`;
	// 	}

	// 	return null;
	// }

	// return (
	// 	<Stack>
	// 		<Heading alignSelf="start" size="md">
	// 			Running Jobs
	// 		</Heading>

	// 		{!runningJobs.length && <p>No jobs are currently running.</p>}

	// 		{runningJobs.map((job) => (
	// 			<div className="flex flex-col space-y-2 p-2 w-full text-xs">
	// 				<Text fontWeight="medium">{trim(job.message) ?? 'Job in Progress'}</Text>
	// <Progress
	// 	value={Number(job.current_task)}
	// 	max={Number(job.task_count)}
	// 	rounded="md"
	// 	w="full"
	// 	size="xs"
	// 	colorScheme="brand"
	// />
	// 				<Text>
	// 					<>
	// 						Scanning file {job.current_task} of {job.task_count}
	// 					</>
	// 				</Text>
	// 			</div>
	// 		))}
	// 	</Stack>
	// );
}

export function QueuedJobs({ jobReports }: { jobReports: JobReport[] }) {
	const { jobs: zustandJobs } = useJobStore();

	const queuedJobs = useMemo(() => {
		return jobReports.filter((job) => job.status === 'QUEUED');
	}, [zustandJobs, jobReports]);

	return (
		<Stack>
			<Heading alignSelf="start" size="md">
				Queued Jobs
			</Heading>

			{!queuedJobs.length && <p>No jobs are queued.</p>}

			<VStack spacing={4} align="start">
				{queuedJobs.map((job, i) => (
					<JobReportComponent key={job.id ?? i} {...job} />
				))}
			</VStack>
		</Stack>
	);
}

export function JobHistory({ jobReports }: { jobReports: JobReport[] }) {
	const { jobs: zustandJobs } = useJobStore();

	const pastJobs = useMemo(() => {
		return jobReports.filter((job) => job.status === 'COMPLETED');
	}, [zustandJobs, jobReports]);

	// TODO: truncate, allow for 'View More' button or something
	return (
		<Stack>
			<Heading alignSelf="start" size="md">
				Completed Jobs
			</Heading>

			{!pastJobs.length && <p>There is no job history to display.</p>}

			<VStack spacing={4} align="start">
				{pastJobs.map((job, i) => (
					<JobReportComponent key={job.id ?? i} {...job} />
				))}
			</VStack>
		</Stack>
	);
}
