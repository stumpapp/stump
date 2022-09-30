import type { JobReport } from '../types';
import { useQuery } from '@tanstack/react-query';
import { QueryCallbacks } from '.';
import { getJobs } from '../api/job';
import { StumpQueryContext } from '../context';

export function useJobReport({ onSuccess, onError }: QueryCallbacks<JobReport[]> = {}) {
	const {
		data: jobReports,
		isLoading,
		isRefetching,
		isFetching,
	} = useQuery(['getJobReports'], () => getJobs().then((res) => res.data), {
		onSuccess,
		onError,
		context: StumpQueryContext,
	});

	return { jobReports, isLoading: isLoading || isRefetching || isFetching };
}
