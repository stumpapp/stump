import { JobReport } from '@stump/core';
import { useQuery } from '@tanstack/react-query';
import { QueryCallbacks } from '.';
import { getJobs } from '../api/job';

export function useJobReport({ onSuccess, onError }: QueryCallbacks<JobReport[]> = {}) {
	const {
		data: jobReports,
		isLoading,
		isRefetching,
		isFetching,
	} = useQuery(['getJobReports'], () => getJobs().then((res) => res.data), {
		onSuccess,
		onError,
	});

	return { jobReports, isLoading: isLoading || isRefetching || isFetching };
}
