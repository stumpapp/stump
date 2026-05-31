import { PREFETCH_STALE_TIME, useSDK } from '@stump/client'
import { graphql, MediaFilterInput, MediaOrderBy } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { FilterInput } from '@/components/filters/context'
import {
	DEFAULT_MEDIA_ORDER_BY,
	useSearchMediaFilter,
	useURLKeywordSearch,
	useURLPageParams,
} from '@/components/filters/useFilterScene'
import { usePrefetchLibraryBooksAlphabet } from '@/components/library/LibraryBooksAlphabet'

export const query = graphql(`
	query LibraryBooksScene(
		$filter: MediaFilterInput!
		$orderBy: [MediaOrderBy!]!
		$pagination: Pagination!
	) {
		media(filter: $filter, orderBy: $orderBy, pagination: $pagination) {
			nodes {
				id
				...BookCard
				...BookMetadata
			}
			pageInfo {
				__typename
				... on OffsetPaginationInfo {
					currentPage
					totalPages
					pageSize
					pageOffset
					zeroBased
				}
			}
		}
	}
`)

export type UsePrefetchLibraryBooksParams = {
	page?: number
	pageSize?: number
	filter: FilterInput[]
	orderBy: MediaOrderBy[]
}

export function getQueryKey(
	cacheKey: string,
	libraryId: string,
	page: number,
	pageSize: number,
	search: string | undefined,
	filters: MediaFilterInput[] | undefined,
	orderBy: MediaOrderBy[] | undefined,
): (string | object | number | MediaFilterInput[] | MediaOrderBy[] | undefined)[] {
	return [cacheKey, libraryId, page, pageSize, search, filters, orderBy]
}

export const usePrefetchLibraryBooks = () => {
	const { sdk } = useSDK()
	const { pageSize } = useURLPageParams()
	const { search } = useURLKeywordSearch()
	const searchFilter = useSearchMediaFilter(search)

	const client = useQueryClient()
	const prefetchAlphabet = usePrefetchLibraryBooksAlphabet()

	const prefetch = useCallback(
		(
			id: string,
			params: UsePrefetchLibraryBooksParams = { filter: [], orderBy: DEFAULT_MEDIA_ORDER_BY },
		) => {
			const pageParams = { page: params.page || 1, pageSize: params.pageSize || pageSize }
			return Promise.all([
				client.prefetchQuery({
					queryKey: getQueryKey(
						sdk.cacheKeys.libraryBooks,
						id,
						pageParams.page,
						pageParams.pageSize,
						search,
						params.filter,
						params.orderBy,
					),
					queryFn: async () => {
						const response = await sdk.execute(query, {
							filter: {
								series: {
									libraryId: { eq: id },
								},
								_and: params.filter,
								_or: searchFilter,
							},
							orderBy: params.orderBy,
							pagination: {
								offset: {
									...pageParams,
								},
							},
						})
						return response
					},
					staleTime: PREFETCH_STALE_TIME,
				}),
				prefetchAlphabet(id),
			])
		},
		[client, pageSize, search, searchFilter, sdk, prefetchAlphabet],
	)

	return prefetch
}
