import { Heading, Stack } from '@chakra-ui/react';
import { useMemo } from 'react';
import shallow from 'zustand/shallow';
import { useJobReport } from '~hooks/useJobReport';
import { useStore } from '~store/store';

// TODO: ORGANIZE BETTER

export function RunningJobs({ jobs }: { jobs: any[] }) {
	const zustandJobs = useStore((state) => state.jobs, shallow);

	const runningJobs = useMemo(() => {
		return jobs
			.filter((job) => job.status === 'RUNNING' && zustandJobs[job.id])
			.map((job) => ({ ...job, ...zustandJobs[job.id] }));
	}, [zustandJobs, jobs]);

	return (
		<Stack>
			<Heading alignSelf="start" size="md">
				Running Jobs
			</Heading>

			{!runningJobs.length && <p>No jobs are currently running.</p>}
		</Stack>
	);
}

export function QueuedJobs({ jobs }: { jobs: any[] }) {
	const zustandJobs = useStore((state) => state.jobs, shallow);

	const queuedJobs = useMemo(() => {
		return jobs.filter((job) => job.status === 'QUEUED');
	}, [zustandJobs, jobs]);

	return (
		<Stack>
			<Heading alignSelf="start" size="md">
				Queued Jobs
			</Heading>

			{!queuedJobs.length && <p>No jobs are queued.</p>}
		</Stack>
	);
}

export function JobHistory({ jobs }: { jobs: any[] }) {
	const zustandJobs = useStore((state) => state.jobs, shallow);

	const pastJobs = useMemo(() => {
		return jobs.filter((job) => job.status === 'COMPLETED');
	}, [zustandJobs, jobs]);

	return (
		<Stack>
			<Heading alignSelf="start" size="md">
				Job History
			</Heading>

			{!pastJobs.length && <p>There is no job history to display.</p>}

			{pastJobs.map((job, i) => (
				<div key={job.id ?? i}>{job.kind}</div>
			))}
		</Stack>
	);
}
