import { PREFETCH_STALE_TIME, useSDK, useSuspenseGraphQL } from '@stump/client'
import { usePrevious, usePreviousIsDifferent } from '@stump/components'
import { graphql, MediaFilterInput, MediaOrderBy } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Suspense, useCallback, useEffect } from 'react'
import { Helmet } from 'react-helmet'

import BookCard from '@/components/book/BookCard'
import BookGrid from '@/components/book/BookGrid'
import {
	FilterContext,
	FilterHeader,
	URLFilterContainer,
	URLFilterDrawer,
	URLOrdering,
	useFilterScene,
} from '@/components/filters'
import {
	useSearchMediaFilter,
	useURLKeywordSearch,
	useURLPageParams,
} from '@/components/filters/useFilterScene'
import TableOrGridLayout from '@/components/TableOrGridLayout'
import useIsInView from '@/hooks/useIsInView'
import { useMediaURLOrderBy } from '@/scenes/bookSearch/BookSearchScene'
import { useBooksLayout } from '@/stores/layout'

import { useSeriesContext } from '../../context'

// export default function SeriesOverviewScene() {
// 	const rootRef = useRef<HTMLDivElement>(null)
// 	const [containerRef, isInView] = useIsInView<HTMLDivElement>()

// 	const { prefetch } = usePrefetchMediaPaged()
// 	const { series } = useSeriesContext()
// 	const { layoutMode, setLayout, columns, setColumns } = useBooksLayout((state) => ({
// 		columns: state.columns,
// 		layoutMode: state.layout,
// 		setColumns: state.setColumns,
// 		setLayout: state.setLayout,
// 	}))
// 	const {
// 		filters,
// 		ordering,
// 		pagination: { page, page_size },
// 		setPage,
// 		...rest
// 	} = useFilterScene()

// 	const params = useMemo(
// 		() => ({
// 			page,
// 			page_size,
// 			params: {
// 				...filters,
// 				...ordering,
// 				series: {
// 					id: [series.id],
// 				},
// 			},
// 		}),
// 		[page, page_size, ordering, filters, series.id],
// 	)
// 	const {
// 		isLoading: isLoadingMedia,
// 		// isRefetching: isRefetchingMedia,
// 		media,
// 		pageData,
// 	} = usePagedMediaQuery(params)
// 	const { current_page, total_pages } = pageData || {}

// 	const differentSearch = usePreviousIsDifferent(filters?.search as string)
// 	useEffect(() => {
// 		if (differentSearch) {
// 			setPage(1)
// 		}
// 	}, [differentSearch, setPage])

// 	const handlePrefetchPage = useCallback(
// 		(page: number) => {
// 			prefetch({
// 				...params,
// 				page,
// 			})
// 		},
// 		[prefetch, params],
// 	)

// 	const previousPage = usePrevious(current_page)
// 	const shouldScroll = !!previousPage && previousPage !== current_page
// 	useEffect(
// 		() => {
// 			if (!isInView && shouldScroll) {
// 				containerRef.current?.scrollIntoView({
// 					behavior: 'smooth',
// 					block: 'nearest',
// 					inline: 'start',
// 				})
// 			}
// 		},
// 		// eslint-disable-next-line react-hooks/exhaustive-deps
// 		[shouldScroll, isInView],
// 	)

// 	const renderContent = () => {
// 		if (layoutMode === 'GRID') {
// 			return (
// 				<URLFilterContainer
// 					currentPage={current_page || 1}
// 					pages={total_pages || 1}
// 					onChangePage={setPage}
// 					onPrefetchPage={handlePrefetchPage}
// 				>
// 					<div className="flex flex-1 px-4 pb-2 pt-4 md:pb-4">
// 						<BookGrid
// 							isLoading={isLoadingMedia}
// 							books={media}
// 							hasFilters={Object.keys(filters || {}).length > 0}
// 						/>
// 					</div>
// 				</URLFilterContainer>
// 			)
// 		} else {
// 			return (
// 				<BookTable
// 					items={media || []}
// 					render={(props) => (
// 						<URLFilterContainer
// 							currentPage={current_page || 1}
// 							pages={total_pages || 1}
// 							onChangePage={setPage}
// 							onPrefetchPage={handlePrefetchPage}
// 							tableControls={
// 								<EntityTableColumnConfiguration
// 									entity="media"
// 									configuration={columns || defaultBookColumnSort}
// 									onSave={setColumns}
// 								/>
// 							}
// 							{...props}
// 						/>
// 					)}
// 				/>
// 			)
// 		}
// 	}

// 	return (
// 		<FilterContext.Provider
// 			value={{
// 				filters,
// 				ordering,
// 				pagination: { page, page_size },
// 				setPage,
// 				...rest,
// 			}}
// 		>
// 			<div className="flex flex-1 flex-col pb-4 md:pb-0" ref={rootRef}>
// 				<Helmet>
// 					<title>Stump | {series.name || ''}</title>
// 				</Helmet>

// 				<section ref={containerRef} id="grid-top-indicator" className="h-0" />

// 				<FilterHeader
// 					layoutControls={<TableOrGridLayout layout={layoutMode} setLayout={setLayout} />}
// 					orderControls={<URLOrdering entity="media" />}
// 					filterControls={<URLFilterDrawer entity="media" />}
// 					navOffset
// 				/>

// 				{renderContent()}
// 			</div>
// 		</FilterContext.Provider>
// 	)
// }

const query = graphql(`
	query SeriesBooksScene(
		$filter: MediaFilterInput!
		$orderBy: [MediaOrderBy!]!
		$pagination: Pagination!
	) {
		media(filter: $filter, orderBy: $orderBy, pagination: $pagination) {
			nodes {
				id
				...BookCard
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
	filter: MediaFilterInput
	orderBy: MediaOrderBy[]
}

export const usePrefetchSeriesBooks = () => {
	const { sdk } = useSDK()
	const { pageSize } = useURLPageParams()
	const { search } = useURLKeywordSearch()
	const searchFilter = useSearchMediaFilter(search)

	const client = useQueryClient()

	const prefetch = useCallback(
		(id: string, params: UsePrefetchSeriesBooksParams = { filter: {}, orderBy: [] }) => {
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
							_and: [params.filter],
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

export default function SeriesBooksSceneContainer() {
	return (
		<Suspense fallback={null}>
			<SeriesBooksScene />
		</Suspense>
	)
}

function getQueryKey(
	cacheKey: string,
	libraryId: string,
	page: number,
	pageSize: number,
	search: string | undefined,
	filters: MediaFilterInput | undefined,
	orderBy: MediaOrderBy[] | undefined,
): (string | object | number | MediaFilterInput | MediaOrderBy[] | undefined)[] {
	return [cacheKey, libraryId, page, pageSize, search, filters, orderBy]
}

function SeriesBooksScene() {
	const { series } = useSeriesContext()
	const {
		filters: mediaFilters,
		ordering,
		pagination: { page, pageSize: pageSizeMaybeUndefined },
		setPage,
		...rest
	} = useFilterScene()
	const filters = mediaFilters as MediaFilterInput
	const pageSize = pageSizeMaybeUndefined || 20 // Fallback to 20 if pageSize is undefined, this should never happen since we set a default in the useFilterScene hook
	const orderBy = useMediaURLOrderBy(ordering)
	const { search } = useURLKeywordSearch()
	const searchFilter = useSearchMediaFilter(search)

	const [containerRef, isInView] = useIsInView<HTMLDivElement>()
	const differentSearch = usePreviousIsDifferent(search)
	useEffect(() => {
		if (differentSearch) {
			setPage(1)
		}
	}, [differentSearch, setPage])

	const { layoutMode, setLayout } = useBooksLayout((state) => ({
		columns: state.columns,
		layoutMode: state.layout,
		setColumns: state.setColumns,
		setLayout: state.setLayout,
	}))

	const { sdk } = useSDK()
	const {
		data: {
			media: { nodes, pageInfo },
		},
		isLoading,
	} = useSuspenseGraphQL(
		query,
		getQueryKey(sdk.cacheKeys.seriesBooks, series.id, page, pageSize, search, filters, orderBy),
		{
			filter: {
				seriesId: { eq: series.id },
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

	const prefetch = usePrefetchSeriesBooks()

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
					<title>Stump | {series.resolvedName || ''}</title>
				</Helmet>

				<section ref={containerRef} id="grid-top-indicator" className="h-0" />

				<FilterHeader
					isSearching={isLoading}
					layoutControls={<TableOrGridLayout layout={layoutMode} setLayout={setLayout} />}
					orderControls={<URLOrdering entity="media" />}
					filterControls={<URLFilterDrawer entity="media" />}
					navOffset
				/>

				<URLFilterContainer
					currentPage={pageInfo.currentPage || 1}
					pages={pageInfo.totalPages || 1}
					onChangePage={(page) => {
						setPage(page)
					}}
					onPrefetchPage={(page) => {
						prefetch(series.id, {
							page,
							pageSize,
							filter: filters,
							orderBy: orderBy,
						})
					}}
				>
					<div className="flex flex-1 px-4 pb-2 pt-4 md:pb-4">
						<BookGrid
							isLoading={isLoading}
							items={nodes.map((node) => (
								<BookCard key={node.id} fragment={node} />
							))}
							hasFilters={Object.keys(filters || {}).length > 0}
						/>
					</div>
				</URLFilterContainer>
			</div>
		</FilterContext.Provider>
	)
}
