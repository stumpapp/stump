import { Log, LogFilter, QueryOrder } from '@stump/types'

import { useSDK } from '../sdk'

import { PageQueryOptions, usePageQuery } from '../client'

type UseLogsQueryParmas = Omit<PageQueryOptions<Log>, 'params'> & {
	params?: LogFilter & Partial<QueryOrder>
}

export function useLogsQuery({ params, ...options }: UseLogsQueryParmas = {}) {
	const { sdk } = useSDK()
	const { data, ...restReturn } = usePageQuery(
		[sdk.log.keys.get, params],
		async ({ page = 1, page_size = 10 }) => sdk.log.get({ page, page_size, ...params }),
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
