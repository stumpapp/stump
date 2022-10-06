import { Stack } from '@chakra-ui/react';
import { useJobReport } from '@stump/client';
import { Helmet } from 'react-helmet';
import { JobHistory, QueuedJobs, RunningJobs } from '../../components/jobs/JobReports';

export default function JobSettings() {
	const { jobReports } = useJobReport();

	if (!jobReports) {
		throw new Error('TODO');
	}

	return (
		<>
			<Helmet>
				{/* Doing this so Helmet splits the title into an array, I'm not just insane lol */}
				<title>Stump | {'Jobs'}</title>
			</Helmet>
			<Stack w="full" spacing={6}>
				<div>I am not implemented yet, ugly content below...</div>

				<RunningJobs jobReports={jobReports} />
				<QueuedJobs jobReports={jobReports} />
				<JobHistory jobReports={jobReports} />
			</Stack>
		</>
	);
}
