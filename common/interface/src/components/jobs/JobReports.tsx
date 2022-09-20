import { useMemo } from 'react';

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
import { JobReport } from '@stump/core';
import { useJobStore } from '@stump/client';

// TODO: ORGANIZE BETTER

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

	// TODO: generalize this since I use it in other places
	// FIXME: this isn't a safe operation
	function trim(message?: string | null) {
		if (message?.startsWith('Analyzing')) {
			let filePieces = message.replace(/"/g, '').split('Analyzing ').filter(Boolean)[0].split('/');

			return `Analyzing ${filePieces.slice(filePieces.length - 1).join('/')}`;
		}

		return null;
	}

	return (
		<Stack>
			<Heading alignSelf="start" size="md">
				Running Jobs
			</Heading>

			{!runningJobs.length && <p>No jobs are currently running.</p>}

			{runningJobs.map((job) => (
				<div className="flex flex-col space-y-2 p-2 w-full text-xs">
					<Text fontWeight="medium">{trim(job.message) ?? 'Job in Progress'}</Text>
					<Progress
						value={Number(job.current_task)}
						max={Number(job.task_count)}
						rounded="md"
						w="full"
						size="xs"
						colorScheme="brand"
					/>
					<Text>
						<>
							Scanning file {job.current_task} of {job.task_count}
						</>
					</Text>
				</div>
			))}
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
				Job History
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
