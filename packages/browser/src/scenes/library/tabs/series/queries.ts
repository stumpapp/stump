import { PREFETCH_STALE_TIME, useSDK } from '@stump/client'
import { graphql, SeriesFilterInput, SeriesOrderBy } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import {
	DEFAULT_SERIES_ORDER_BY,
	useSearchSeriesFilter,
	useURLKeywordSearch,
	useURLPageParams,
} from '@/components/filters/useFilterScene'
import { usePrefetchLibrarySeriesAlphabet } from '@/components/library/LibrarySeriesAlphabet'

export const query = graphql(`
	query LibrarySeries(
		$filter: SeriesFilterInput!
		$orderBy: [SeriesOrderBy!]!
		$pagination: Pagination!
	) {
		series(filter: $filter, orderBy: $orderBy, pagination: $pagination) {
			nodes {
				id
				resolvedName
				mediaCount
				percentageCompleted
				status
				stackedThumbnails {
					url
					metadata {
						averageColor
						colors {
							color
							percentage
						}
						thumbhash
					}
				}
				oneshotBook {
					id
				}
			}
			pageInfo {
				__typename
				... on OffsetPaginationInfo {
					totalPages
					currentPage
					pageSize
					pageOffset
					zeroBased
				}
			}
		}
	}
`)

export type UsePrefetchLibrarySeriesParams = {
	page?: number
	pageSize?: number
	filter?: SeriesFilterInput[]
	orderBy: SeriesOrderBy[]
}

export function getQueryKey(
	cacheKey: string,
	libraryId: string,
	page: number,
	pageSize: number,
	search: string | undefined,
	filters: SeriesFilterInput[] | undefined,
	orderBy: SeriesOrderBy[] | undefined,
): (string | object | number | SeriesFilterInput[] | SeriesOrderBy[] | undefined)[] {
	return [cacheKey, libraryId, page, pageSize, search, filters, orderBy]
}

export const usePrefetchLibrarySeries = () => {
	const { sdk } = useSDK()
	const { pageSize } = useURLPageParams()
	const { search } = useURLKeywordSearch()
	const searchFilter = useSearchSeriesFilter(search)

	const client = useQueryClient()
	const prefetchAlphabet = usePrefetchLibrarySeriesAlphabet()

	return useCallback(
		(
			libraryId: string,
			params: UsePrefetchLibrarySeriesParams = { filter: [], orderBy: DEFAULT_SERIES_ORDER_BY },
		) => {
			const pageParams = { page: params.page || 1, pageSize: params.pageSize || pageSize }
			return Promise.all([
				client.prefetchQuery({
					queryKey: getQueryKey(
						sdk.cacheKeys.librarySeries,
						libraryId,
						pageParams.page,
						pageParams.pageSize,
						search,
						params.filter,
						params.orderBy,
					),
					queryFn: async () => {
						const response = await sdk.execute(query, {
							filter: {
								libraryId: { eq: libraryId },
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
				prefetchAlphabet(libraryId),
			])
		},
		[pageSize, search, searchFilter, sdk, client, prefetchAlphabet],
	)
}
