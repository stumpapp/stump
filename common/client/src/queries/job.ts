import { useQuery } from '@tanstack/react-query';

import { getJobs } from '../api/job';
import { StumpQueryContext } from '../context';
import type { JobReport } from '../types';
import { QueryCallbacks } from '.';

export function useJobReport({ onSuccess, onError }: QueryCallbacks<JobReport[]> = {}) {
	const {
		data: jobReports,
		isLoading,
		isRefetching,
		isFetching,
	} = useQuery(['getJobReports'], () => getJobs().then((res) => res.data), {
		context: StumpQueryContext,
		onError,
		onSuccess,
	});

	return { isLoading: isLoading || isRefetching || isFetching, jobReports };
}
