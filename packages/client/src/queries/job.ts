import { getJobs } from '@stump/api'
import type { JobReport } from '@stump/types'

import { useQuery } from '../client'
import { QueryCallbacks } from '.'

export function useJobReport({ onSuccess, onError }: QueryCallbacks<JobReport[]> = {}) {
	const {
		data: jobReports,
		isLoading,
		isRefetching,
		isFetching,
	} = useQuery(['getJobReports'], () => getJobs().then((res) => res.data), {
		onError,
		onSuccess,
	})

	return { isLoading: isLoading || isRefetching || isFetching, jobReports }
}
