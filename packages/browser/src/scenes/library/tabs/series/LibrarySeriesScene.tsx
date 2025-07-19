import { PREFETCH_STALE_TIME, useSDK, useSuspenseGraphQL } from '@stump/client'
import { usePrevious, usePreviousIsDifferent } from '@stump/components'
import {
	graphql,
	OrderDirection,
	SeriesFilterInput,
	SeriesModelOrdering,
	SeriesOrderBy,
} from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import { Helmet } from 'react-helmet'

import {
	FilterContext,
	FilterHeader,
	FilterProvider,
	URLFilterContainer,
	URLFilterDrawer,
	URLOrdering,
	useFilterScene,
} from '@/components/filters'
import { Ordering } from '@/components/filters/context'
import {
	DEFAULT_SERIES_ORDER_BY,
	useSearchSeriesFilter,
	useURLKeywordSearch,
	useURLPageParams,
} from '@/components/filters/useFilterScene'
import SeriesGrid from '@/components/series/SeriesGrid'
import TableOrGridLayout from '@/components/TableOrGridLayout'
import useIsInView from '@/hooks/useIsInView'
import { useSeriesLayout } from '@/stores/layout'

import { useLibraryContext } from '../../context'

const query = graphql(`
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
	filter?: SeriesFilterInput
	orderBy: SeriesOrderBy[]
}

export const usePrefetchLibrarySeries = () => {
	const { sdk } = useSDK()
	const { pageSize } = useURLPageParams()
	const { search } = useURLKeywordSearch()
	const searchFilter = useSearchSeriesFilter(search)

	const client = useQueryClient()
	return useCallback(
		(
			libraryId: string,
			params: UsePrefetchLibrarySeriesParams = { orderBy: DEFAULT_SERIES_ORDER_BY },
		) => {
			const pageParams = { page: params.page || 1, pageSize: params.pageSize || pageSize }
			return client.prefetchQuery({
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
							_and: [params.filter || {}],
							_or: searchFilter,
						},
						orderBy: params.orderBy || ([] as SeriesOrderBy[]),
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
		[pageSize, search, searchFilter, sdk, client],
	)
}

export default function LibrarySeriesSceneWrapper() {
	return (
		<FilterProvider>
			<LibrarySeriesScene />
		</FilterProvider>
	)
}

function useSeriesURLOrderBy(ordering: Ordering): SeriesOrderBy[] {
	return useMemo(() => {
		// check for undefined values
		if (!ordering || !ordering.order_by || !ordering.direction) {
			return DEFAULT_SERIES_ORDER_BY
		}

		return [
			{
				series: {
					field: ordering.order_by as SeriesModelOrdering,
					direction: ordering.direction as OrderDirection,
				},
			},
		] as SeriesOrderBy[]
	}, [ordering])
}

function getQueryKey(
	cacheKey: string,
	libraryId: string,
	page: number,
	pageSize: number,
	search: string | undefined,
	filters: SeriesFilterInput | undefined,
	orderBy: SeriesOrderBy[] | undefined,
): (string | object | number | SeriesFilterInput | SeriesOrderBy[] | undefined)[] {
	return [cacheKey, libraryId, page, pageSize, search, filters, orderBy]
}

function LibrarySeriesScene() {
	const {
		library: { id, name },
	} = useLibraryContext()
	const {
		filters: seriesFilters,
		ordering,
		pagination: { page, pageSize: pageSizeMaybeUndefined },
		setPage,
		...rest
	} = useFilterScene()
	const pageSize = pageSizeMaybeUndefined || 20 // Fallback to 20 if pageSize is undefined, this should never happen since we set a default in the useFilterScene hook
	const filters = seriesFilters as SeriesFilterInput
	const orderBy = useSeriesURLOrderBy(ordering)
	const { search } = useURLKeywordSearch()
	const searchFilter = useSearchSeriesFilter(search)

	const differentSearch = usePreviousIsDifferent(search)
	useEffect(() => {
		if (differentSearch) {
			setPage(1)
		}
	}, [differentSearch, setPage])

	const { layoutMode, setLayout } = useSeriesLayout((state) => ({
		columns: state.columns,
		layoutMode: state.layout,
		setColumns: state.setColumns,
		setLayout: state.setLayout,
	}))

	const { sdk } = useSDK()
	const {
		data: {
			series: { nodes, pageInfo },
		},
		isLoading,
	} = useSuspenseGraphQL(
		query,
		[getQueryKey(sdk.cacheKeys.librarySeries, id, page, pageSize, search, filters, orderBy)],
		{
			filter: {
				libraryId: { eq: id },
				_and: [filters],
				_or: searchFilter,
			},
			orderBy,
			pagination: {
				offset: {
					page,
					pageSize,
				},
			},
		},
	)

	const [containerRef, isInView] = useIsInView<HTMLDivElement>()

	const prefetch = usePrefetchLibrarySeries()

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

	return (
		<FilterContext.Provider
			value={{
				filters,
				ordering,
				pagination: { page, pageSize },
				setPage,
				...rest,
			}}
		>
			<div className="flex flex-1 flex-col pb-4 md:pb-0">
				<Helmet>
					<title>Stump | {name}</title>
				</Helmet>

				<section ref={containerRef} id="grid-top-indicator" className="h-0" />

				<FilterHeader
					isSearching={isLoading}
					layoutControls={<TableOrGridLayout layout={layoutMode} setLayout={setLayout} />}
					orderControls={<URLOrdering entity="series" />}
					filterControls={<URLFilterDrawer entity="series" />}
					navOffset
				/>

				<URLFilterContainer
					currentPage={pageInfo.currentPage || 1}
					pages={pageInfo.totalPages || 1}
					onChangePage={(page) => {
						setPage(page)
					}}
					onPrefetchPage={(page) => {
						prefetch(id, {
							page,
							pageSize,
							filter: filters,
							orderBy,
						})
					}}
				>
					<div className="flex flex-1 px-4 pb-2 pt-4 md:pb-4">
						<SeriesGrid
							isLoading={isLoading}
							series={nodes}
							hasFilters={Object.keys(filters || {}).length > 0}
						/>
					</div>
				</URLFilterContainer>
			</div>
		</FilterContext.Provider>
	)
}

// const { layoutMode, setLayout } = useSeriesLayout((state) => ({
// 	layoutMode: state.layout,
// 	setLayout: state.setLayout,
// }))
// const { isLoading, library } = useLibraryByID(id)
// const {
// 	filters,
// 	ordering,
// 	pagination: { page, page_size },
// 	setPage,
// 	...rest
// } = useFilterScene()
// const { prefetch } = usePrefetchPagedSeries()

// const params = useMemo(
// 	() => ({
// 		page,
// 		page_size,
// 		params: {
// 			...filters,
// 			...ordering,
// 			count_media: true,
// 			library: {
// 				id: [id],
// 			},
// 		},
// 	}),
// 	[page, page_size, filters, ordering, id],
// )
// const {
// 	isLoading: isLoadingSeries,
// 	isRefetching: isRefetchingSeries,
// 	series,
// 	pageData,
// } = usePagedSeriesQuery(params)
// const { current_page, total_pages } = pageData || {}

// const differentSearch = usePreviousIsDifferent(filters?.search as string)
// useEffect(() => {
// 	if (differentSearch) {
// 		setPage(1)
// 	}
// }, [differentSearch, setPage])

// const handlePrefetchPage = useCallback(
// 	(page: number) => {
// 		prefetch({
// 			...params,
// 			page,
// 		})
// 	},
// 	[params, prefetch],
// )

// const previousPage = usePrevious(current_page)
// const shouldScroll = !!previousPage && previousPage !== current_page
// useEffect(
// 	() => {
// 		if (!isInView && shouldScroll) {
// 			containerRef.current?.scrollIntoView({
// 				behavior: 'smooth',
// 				block: 'nearest',
// 				inline: 'start',
// 			})
// 		}
// 	},
// 	// eslint-disable-next-line react-hooks/exhaustive-deps
// 	[isInView, shouldScroll],
// )

// if (isLoading) {
// 	return null
// } else if (!library) {
// 	throw new Error('Library not found')
// }

// const renderContent = () => {
// 	if (layoutMode === 'GRID') {
// 		return (
// 			<URLFilterContainer
// 				currentPage={current_page || 1}
// 				pages={total_pages || 1}
// 				onChangePage={setPage}
// 				onPrefetchPage={handlePrefetchPage}
// 			>
// 				<div className="flex flex-1 px-4 pb-2 pt-4 md:pb-4">
// 					<SeriesGrid
// 						isLoading={isLoadingSeries}
// 						series={series}
// 						hasFilters={Object.keys(filters || {}).length > 0}
// 					/>
// 				</div>
// 			</URLFilterContainer>
// 		)
// 	} else {
// 		return (
// 			<SeriesTable
// 				items={series || []}
// 				render={(props) => (
// 					<URLFilterContainer
// 						currentPage={current_page || 1}
// 						pages={total_pages || 1}
// 						onChangePage={setPage}
// 						onPrefetchPage={handlePrefetchPage}
// 						// tableControls={<BookTableColumnConfiguration />}
// 						{...props}
// 					/>
// 				)}
// 			/>
// 		)
// 	}
// }

// return (
// 	<FilterContext.Provider
// 		value={{
// 			filters,
// 			ordering,
// 			pagination: { page, page_size },
// 			setPage,
// 			...rest,
// 		}}
// 	>
// 		<div className="flex flex-1 flex-col pb-4 md:pb-0">
// 			<Helmet>
// 				<title>Stump | {library.name}</title>
// 			</Helmet>

// 			<section ref={containerRef} id="grid-top-indicator" className="h-0" />

// 			<FilterHeader
// 				isSearching={isRefetchingSeries}
// 				layoutControls={<TableOrGridLayout layout={layoutMode} setLayout={setLayout} />}
// 				orderControls={<URLOrdering entity="series" />}
// 				filterControls={<URLFilterDrawer entity="series" />}
// 				navOffset
// 			/>

// 			{renderContent()}
// 		</div>
// 	</FilterContext.Provider>
// )
