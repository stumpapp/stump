import { Stack } from '@chakra-ui/react';
import { useJobReport } from '@stump/client';
import { Helmet } from 'react-helmet';
import { RunningJobs } from '../../components/jobs/RunningJobs';
import JobsTable from '../../components/jobs/JobsTable';

// TODO: fix error/loading state lol
export default function JobSettings() {
	const { isLoading, jobReports } = useJobReport();

	if (!jobReports && isLoading) {
		throw new Error('TODO');
	} else if (isLoading) {
		return <p>Loading...</p>;
	}

	return (
		<>
			<Helmet>
				{/* Doing this so Helmet splits the title into an array, I'm not just insane lol */}
				<title>Stump | {'Jobs'}</title>
			</Helmet>
			<Stack w="full" spacing={6}>
				<div>I am not implemented yet, ugly content below...</div>

				<RunningJobs jobReports={jobReports!} />
				{/* FIXME: starting a job while on the page causes a weird stutter/flicker */}
				<JobsTable />
			</Stack>
		</>
	);
}
