import { Stack } from '@chakra-ui/react';
import { Helmet } from 'react-helmet';
import { JobHistory, QueuedJobs, RunningJobs } from '~components/Jobs/JobReport';
import { useJobReport } from '~hooks/useJobReport';

export default function JobSettingsTab() {
	const { jobs } = useJobReport();

	if (!jobs) {
		throw new Error('TODO');
	}

	return (
		<>
			<Helmet>
				{/* Doing this so Helmet splits the title into an array, I'm not just insane lol */}
				<title>Stump | {'Jobs'}</title>
			</Helmet>
			<Stack w="full" spacing={6}>
				<RunningJobs jobs={jobs} />
				<QueuedJobs jobs={jobs} />
				<JobHistory jobs={jobs} />
			</Stack>
		</>
	);
}
