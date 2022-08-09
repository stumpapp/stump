import { useQuery } from '@tanstack/react-query';
import { getJobs } from '~api/job';

export function useJobReport() {
	const { data } = useQuery(['getJobReports'], getJobs);

	return { jobs: data?.data as any[] };
}
