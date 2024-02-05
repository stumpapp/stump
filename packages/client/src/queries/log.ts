import { logApi, logQueryKeys } from '@stump/api'
import { Log } from '@stump/types'

import { PageQueryOptions, usePageQuery } from '../client'

// TODO: use generated type
type UseLogsQueryParmas = PageQueryOptions<Log> & {
	params?: Record<string, unknown>
}

export function useLogsQuery({ params, ...options }: UseLogsQueryParmas = {}) {
	const { data, ...restReturn } = usePageQuery(
		[logQueryKeys.getLogs, params],
		async ({ page = 1, page_size = 10 }) => {
			const { data } = await logApi.getLogs({ page, page_size, ...params })
			return data
		},
		{
			keepPreviousData: true,
			...options,
		},
	)

	const logs = data?.data ?? []
	const pageData = data?._page

	return {
		logs,
		pageData,
		...restReturn,
	}
}
