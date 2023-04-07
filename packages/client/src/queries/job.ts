import { getJobs } from '@stump/api'
import type { JobReport } from '@stump/types'

import { QueryOptions, useQuery } from '../client'

export function useJobReport({ onSuccess, onError, ...options }: QueryOptions<JobReport[]> = {}) {
	const {
		data: jobReports,
		isLoading,
		isRefetching,
		isFetching,
	} = useQuery(['getJobReports'], () => getJobs().then((res) => res.data), {
		onError,
		onSuccess,
		...options,
	})

	return { isLoading: isLoading || isRefetching || isFetching, jobReports }
}
