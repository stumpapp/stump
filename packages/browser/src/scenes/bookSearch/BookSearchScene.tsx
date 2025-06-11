import { PREFETCH_STALE_TIME, useSDK, useSuspenseGraphQL } from '@stump/client'
import { usePrevious } from '@stump/components'
import { graphql, MediaModelOrdering, MediaOrderBy, OrderDirection } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Suspense, useCallback, useEffect, useMemo } from 'react'
import { Helmet } from 'react-helmet'
import { useSearchParams } from 'react-router-dom'

import { BookTable } from '@/components/book'
import BookGrid from '@/components/book/BookGrid'
import {
	FilterHeader,
	URLFilterContainer,
	URLFilterDrawer,
	URLMediaOrderBy,
} from '@/components/filters'
import { useURLPageParams } from '@/components/filters/useFilterScene'
import { EntityTableColumnConfiguration } from '@/components/table'
import TableOrGridLayout from '@/components/TableOrGridLayout'
import useIsInView from '@/hooks/useIsInView'
import { useBooksLayout } from '@/stores/layout'

const ORDER_BY_WHITELIST: MediaModelOrdering[] = [
	MediaModelOrdering.Name,
	MediaModelOrdering.Status,
	MediaModelOrdering.CreatedAt,
	MediaModelOrdering.Path,
	MediaModelOrdering.Size,
	MediaModelOrdering.Extension,
	MediaModelOrdering.Pages,
	MediaModelOrdering.SeriesId,
	MediaModelOrdering.ModifiedAt,
]

const query = graphql(`
	query BookSearchScene(
		$filter: MediaFilterInput!
		$orderBy: [MediaOrderBy!]!
		$pagination: Pagination!
	) {
		media(filter: $filter, orderBy: $orderBy, pagination: $pagination) {
			nodes {
				id
				resolvedName
				pages
				size
				status
				thumbnail {
					url
				}
				readProgress {
					percentageCompleted
					epubcfi
					page
				}
				readHistory {
					__typename
				}
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

export type UsePrefetchBookSearchParams = {
	page?: number
	pageSize?: number
	orderBy?: MediaOrderBy[]
}

export const usePrefetchBookSearch = (orderBy: MediaOrderBy[]) => {
	const { sdk } = useSDK()
	const { pageSize } = useURLPageParams()

	const client = useQueryClient()

	const prefetch = useCallback(
		(params: UsePrefetchBookSearchParams = {}) => {
			const pageParams = { page: params.page || 1, pageSize: params.pageSize || pageSize }
			return client.prefetchQuery({
				queryKey: getQueryKey(pageParams.page, pageParams.pageSize, orderBy),
				queryFn: async () => {
					const response = await sdk.execute(query, {
						filter: {},
						orderBy: orderBy,
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
		[client, orderBy, pageSize, sdk],
	)

	return prefetch
}

const DEFAULT_SORT: MediaOrderBy[] = [
	{
		media: {
			field: MediaModelOrdering.Name,
			direction: OrderDirection.Asc,
		},
	},
]

function useMediaURLOrderBy(): {
	orderBy: MediaOrderBy[]
	setOrderBy: (orderBy: MediaOrderBy[]) => void
} {
	const client = useQueryClient()
	const [searchParams, setSearchParams] = useSearchParams()
	const { page, pageSize } = useURLPageParams()

	const orderBy = useMemo(() => {
		// order by is a json array of serialized GraphQL object
		const orderByValue = searchParams.get('order_by')
		if (orderByValue) {
			try {
				return JSON.parse(orderByValue) as MediaOrderBy[]
			} catch (e) {
				console.error('Failed to parse order_by from URL', e)
			}
		}

		return DEFAULT_SORT
	}, [searchParams])

	const setOrderBy = useCallback(
		(orderBy: Array<MediaOrderBy>) => {
			setSearchParams((prev) => {
				if (orderBy) {
					prev.set('order_by', JSON.stringify(orderBy))
				} else {
					prev.delete('order_by')
				}
				const pageParams = {
					page,
					pageSize,
					orderBy: orderBy,
				}
				client.invalidateQueries({ queryKey: ['booksSearch', pageParams] })
				return prev
			})
		},
		[setSearchParams, client, page, pageSize],
	)

	return { orderBy, setOrderBy }
}

export default function BookSearchSceneContainer() {
	return (
		<Suspense fallback={null}>
			<BookSearchScene />
		</Suspense>
	)
}

function getQueryKey(page: number, pageSize: number, orderBy: MediaOrderBy[]) {
	return ['booksSearch', { page, pageSize, orderBy }]
}

function BookSearchScene() {
	const [containerRef, isInView] = useIsInView<HTMLDivElement>()
	const { page, pageSize, setPage } = useURLPageParams()
	const { orderBy, setOrderBy } = useMediaURLOrderBy()
	const { layoutMode, setLayout } = useBooksLayout((state) => ({
		columns: state.columns,
		layoutMode: state.layout,
		setColumns: state.setColumns,
		setLayout: state.setLayout,
	}))

	const {
		data: {
			media: { nodes, pageInfo },
		},
		isLoading,
	} = useSuspenseGraphQL(query, getQueryKey(page, pageSize, orderBy), {
		filter: {},
		orderBy: orderBy,
		pagination: {
			offset: {
				page,
				pageSize,
			},
		},
	})
	const prefetch = usePrefetchBookSearch(orderBy)
	if (pageInfo.__typename !== 'OffsetPaginationInfo') {
		throw new Error('Invalid pagination type, expected OffsetPaginationInfo')
	}

	const previousPage = usePrevious(pageInfo.currentPage)
	const shouldScroll = !!previousPage && previousPage !== pageInfo.currentPage
	useEffect(
		() => {
			if (!isInView && shouldScroll) {
				containerRef.current?.scrollIntoView({
					behavior: 'smooth',
					block: 'nearest',
					inline: 'start',
				})
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[shouldScroll, isInView],
	)

	const renderContent = () => {
		if (layoutMode === 'GRID') {
			return (
				<URLFilterContainer
					currentPage={pageInfo.currentPage || 1}
					pages={pageInfo.totalPages || 1}
					onChangePage={setPage}
					onPrefetchPage={(page) => {
						prefetch({
							page,
							pageSize,
						})
					}}
				>
					<div className="flex flex-1 px-4 pb-2 pt-4 md:pb-4">
						<BookGrid
							isLoading={isLoading}
							books={nodes}
							// hasFilters={Object.keys(filters || {}).length > 0}
						/>
					</div>
				</URLFilterContainer>
			)
		} else {
			return null
			// TODO(graphql): migrate BookTable
			// return (
			// 	<BookTable
			// 		books={nodes}
			// 		render={(props) => (
			// 			<URLFilterContainer
			// 				currentPage={pageInfo.currentPage || 1}
			// 				pages={pageInfo.totalPages || 1}
			// 				onChangePage={setPage}
			// 				onPrefetchPage={(page) => {
			// 					prefetch({
			// 						page,
			// 						pageSize,
			// 					})
			// 				}}
			// 				tableControls={
			// 					<EntityTableColumnConfiguration
			// 						entity="media"
			// 						configuration={columns || defaultBookColumnSort}
			// 						onSave={setColumns}
			// 					/>
			// 				}
			// 				{...props}
			// 			/>
			// 		)}
			// 	/>
			// )
		}
	}

	return (
		<div className="flex flex-1 flex-col pb-4 md:pb-0">
			<Helmet>
				<title>Stump | Books</title>
			</Helmet>

			<section ref={containerRef} id="grid-top-indicator" className="h-0" />

			<FilterHeader
				isSearching={isLoading}
				layoutControls={<TableOrGridLayout layout={layoutMode} setLayout={setLayout} />}
				orderControls={
					<URLMediaOrderBy
						sortableFields={ORDER_BY_WHITELIST}
						orderBy={orderBy}
						setOrderBy={setOrderBy}
					/>
				}
				filterControls={<URLFilterDrawer entity="media" />}
			/>

			{renderContent()}
		</div>
	)
}
