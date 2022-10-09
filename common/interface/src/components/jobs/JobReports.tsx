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
import { cancelJob } from '@stump/client/api';
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
	const { jobs: zustandJobs } = useJobStore();

	const runningJobs = useMemo(() => {
		return jobReports
			.filter((job) => job.status === 'RUNNING' && job.id && zustandJobs[job.id])
			.map((job) => ({ ...job, ...zustandJobs[job.id!] }));
	}, [zustandJobs, jobReports]);

	function readableKind(kind: string | null) {
		if (!kind) {
			return 'Unknown';
		}

		return kind.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
	}

	async function handleCancelJob(id: string | null) {
		if (id) {
			toast.promise(cancelJob(id), {
				loading: 'Cancelling job...',
				success: 'Job cancelled',
				error: 'Failed to cancel job',
			});
		} else {
			console.debug('Tried to cancel job with no ID: ', runningJobs);
		}
	}

	return (
		<Stack>
			<Heading alignSelf="start" size="md">
				Active Job
			</Heading>

			{!runningJobs.length && <EmptyState message="No jobs are currently running" />}

			<Stack p={0} m={0}>
				{runningJobs.map((job) => {
					return (
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
										{readableKind(job.kind)}
									</Text>
									<Text
										color={useColorModeValue('gray.600', 'gray.400')}
										fontSize="xs"
										className="italic"
									>
										{job.details}
									</Text>
								</div>
								<Button size="xs" onClick={() => handleCancelJob(job.id)}>
									Cancel Job
								</Button>
							</div>

							<div className="flex flex-col space-y-2 w-full text-xs">
								<Text fontWeight="medium">{job.message}</Text>
								<div className="flex items-center space-x-2">
									<Progress
										value={Number(job.current_task)}
										max={Number(job.task_count)}
										rounded="md"
										w="full"
										size="xs"
										colorScheme="brand"
									/>

									<Text fontSize="xs" className="min-w-fit">
										<>
											{job.current_task} / {job.task_count}
										</>
									</Text>
								</div>
							</div>
						</VStack>
					);
				})}
			</Stack>
		</Stack>
	);
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
