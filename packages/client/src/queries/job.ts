import { jobApi, jobQueryKeys } from '@stump/api'
import type { JobDetail } from '@stump/types'

import { PageQueryOptions, usePageQuery } from '../client'

type UseJobsQueryParmas = PageQueryOptions<JobDetail> & {
	params?: Record<string, unknown>
}
// TODO(aaron): investigate why params from queryFn is not being properly populated, i.e.
// it is empty when the params from the useJobsQuery args is not empty. usePageQuery
// is supposed to track and pass the params to the queryFn...
export function useJobsQuery({ params, ...options }: UseJobsQueryParmas = {}) {
	const { data, ...restReturn } = usePageQuery(
		[jobQueryKeys.getJobs, params],
		async ({ page = 1, page_size = 10 }) => {
			const { data } = await jobApi.getJobs({ page, page_size, ...params })
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
