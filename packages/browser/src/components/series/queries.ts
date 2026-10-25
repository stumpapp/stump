import { PREFETCH_STALE_TIME, useSDK } from '@stump/client'
import {
	graphql,
	MediaFilterInput,
	MediaMetadataModelOrdering,
	MediaOrderBy,
	OrderDirection,
} from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import {
	DEFAULT_MEDIA_ORDER_BY,
	useSearchMediaFilter,
	useURLKeywordSearch,
	useURLPageParams,
} from '@/components/filters/useFilterScene'

export const seriesLayoutQuery = graphql(`
	query SeriesLayout($id: ID!) {
		seriesById(id: $id) {
			id
			path
			library {
				id
				name
			}
			resolvedName
			resolvedDescription
			stats {
				bookCount
				completedBooks
				inProgressBooks
				totalBytes
				totalReadingTimeSeconds
			}
			tags {
				id
				name
			}
			thumbnail {
				url
				metadata {
					averageColor
					thumbhash
					colors {
						color
						percentage
					}
				}
			}
			createdAt
			updatedAt
		}
	}
`)

export const DEFAULT_SERIES_BOOKS_ORDER_BY: MediaOrderBy[] = [
	{ metadata: { field: MediaMetadataModelOrdering.Number, direction: OrderDirection.Asc } },
	...DEFAULT_MEDIA_ORDER_BY,
] as MediaOrderBy[]

export const query = graphql(`
	query SeriesBooksScene(
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

export type UsePrefetchSeriesBooksParams = {
	page?: number
	pageSize?: number
	filter: MediaFilterInput[]
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

export const usePrefetchSeriesBooks = () => {
	const { sdk } = useSDK()
	const { pageSize } = useURLPageParams()
	const { search } = useURLKeywordSearch()
	const searchFilter = useSearchMediaFilter(search)

	const client = useQueryClient()

	const prefetch = useCallback(
		(
			id: string,
			params: UsePrefetchSeriesBooksParams = {
				filter: [],
				orderBy: DEFAULT_SERIES_BOOKS_ORDER_BY,
			},
		) => {
			const pageParams = { page: params.page || 1, pageSize: params.pageSize || pageSize }
			return client.prefetchQuery({
				queryKey: getQueryKey(
					sdk.cacheKeys.seriesBooks,
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
							seriesId: { eq: id },
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
			})
		},
		[client, search, searchFilter, pageSize, sdk],
	)

	return prefetch
}

export const usePrefetchSeries = () => {
	const { sdk } = useSDK()

	const client = useQueryClient()
	return (id: string) =>
		client.prefetchQuery({
			queryKey: ['seriesById', id],
			queryFn: async () => {
				const response = await sdk.execute(seriesLayoutQuery, {
					id,
				})
				return response
			},
			staleTime: PREFETCH_STALE_TIME,
		})
}
