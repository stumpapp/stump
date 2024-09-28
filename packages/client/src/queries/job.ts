import type { JobSchedulerConfig, PersistedJob } from '@stump/types'

import { PageQueryOptions, useMutation, usePageQuery, useQuery } from '../client'
import { useSDK } from '../sdk'

type UseJobsQueryParmas = PageQueryOptions<PersistedJob> & {
	params?: Record<string, unknown>
}
export function useJobsQuery({ params, ...options }: UseJobsQueryParmas = {}) {
	const { sdk } = useSDK()
	const { data, ...restReturn } = usePageQuery(
		[sdk.job.keys.get, params],
		({ page = 1, page_size = 10 }) => sdk.job.get({ page, page_size, params }),
		{
			keepPreviousData: true,
			...options,
		},
	)

	const jobs = data?.data
	const pageData = data?._page

	return {
		jobs,
		pageData,
		...restReturn,
	}
}

export function useJobSchedulerConfig() {
	const { sdk } = useSDK()
	const { data: config, ...restReturn } = useQuery([sdk.job.keys.getSchedulerConfig], () =>
		sdk.job.getSchedulerConfig(),
	)

	const {
		mutate: update,
		isLoading: isUpdating,
		isError: isUpdateError,
	} = useMutation([sdk.job.keys.updateSchedulerConfig], (payload: JobSchedulerConfig) =>
		sdk.job.updateSchedulerConfig(payload),
	)

	return { config, isUpdateError, isUpdating, update, ...restReturn }
}
