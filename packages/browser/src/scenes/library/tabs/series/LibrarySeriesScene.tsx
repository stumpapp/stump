import {
	PREFETCH_STALE_TIME,
	useLibraryByID,
	usePagedSeriesQuery,
	usePrefetchPagedSeries,
	useSDK,
	useSuspenseGraphQL,
} from '@stump/client'
import { usePrevious, usePreviousIsDifferent } from '@stump/components'
import { graphql, SeriesFilterInput } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router'

import {
	FilterContext,
	FilterHeader,
	FilterProvider,
	URLFilterContainer,
	URLFilterDrawer,
	URLOrdering,
	useFilterScene,
} from '@/components/filters'
import { useURLPageParams } from '@/components/filters/useFilterScene'
import { SeriesTable } from '@/components/series'
import SeriesGrid from '@/components/series/SeriesGrid'
import TableOrGridLayout from '@/components/TableOrGridLayout'
import useIsInView from '@/hooks/useIsInView'
import { usePrefetchSeriesBooks } from '@/scenes/series'
import { useSeriesLayout } from '@/stores/layout'

import { useLibraryContext } from '../../context'

const query = graphql(`
	query LibrarySeries($filter: SeriesFilterInput!, $pagination: Pagination!) {
		series(filter: $filter, pagination: $pagination) {
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
}

export const usePrefetchLibrarySeries = () => {
	const { sdk } = useSDK()
	const { pageSize } = useURLPageParams()

	const client = useQueryClient()
	return useCallback(
		(libraryId: string, params: UsePrefetchLibrarySeriesParams = {}) => {
			const pageParams = { page: params.page || 1, pageSize: params.pageSize || pageSize }
			return client.prefetchQuery({
				queryKey: ['librarySeries', libraryId],
				queryFn: async () => {
					const response = await sdk.execute(query, {
						filter: {
							...params.filter,
							libraryId: { eq: libraryId },
						},
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
		[pageSize, sdk, client],
	)
}

export default function LibrarySeriesSceneWrapper() {
	return (
		<FilterProvider>
			<LibrarySeriesScene />
		</FilterProvider>
	)
}

function LibrarySeriesScene() {
	const {
		library: { id, name },
	} = useLibraryContext()
	const { page, pageSize, setPage } = useURLPageParams()

	const {
		data: {
			series: { nodes, pageInfo },
		},
		isLoading,
	} = useSuspenseGraphQL(query, ['librarySeries', id, { page, pageSize }], {
		filter: {
			libraryId: { eq: id },
		},
		pagination: {
			offset: {
				page,
				pageSize,
			},
		},
	})

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
		<div className="flex flex-1 flex-col pb-4 md:pb-0">
			<Helmet>
				<title>Stump | {name}</title>
			</Helmet>

			<section ref={containerRef} id="grid-top-indicator" className="h-0" />

			<FilterHeader
				// layoutControls={<TableOrGridLayout layout={layoutMode} setLayout={setLayout} />}
				// orderControls={<URLOrdering entity="media" />}
				// filterControls={<URLFilterDrawer entity="media" />}
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
					})
				}}
			>
				<div className="flex flex-1 px-4 pb-2 pt-4 md:pb-4">
					<SeriesGrid
						isLoading={isLoading}
						series={nodes}
						// hasFilters={Object.keys(filters || {}).length > 0}
					/>
				</div>
			</URLFilterContainer>
		</div>
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
