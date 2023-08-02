import { jobApi, jobQueryKeys } from '@stump/api'
import type { JobDetail } from '@stump/types'

import { PageQueryOptions, usePageQuery } from '../client'

type UseJobsQueryParmas = PageQueryOptions<JobDetail> & {
	params?: Record<string, unknown>
}
export function useJobsQuery({ params, ...options }: UseJobsQueryParmas = {}) {
	const { data, ...restReturn } = usePageQuery(
		[jobQueryKeys.getJobs, params],
		async ({ page = 1, ...rest }) => {
			const { data } = await jobApi.getJobs({ page, ...rest })
			return data
		},
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
