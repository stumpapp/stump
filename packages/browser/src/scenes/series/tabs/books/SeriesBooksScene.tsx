import {
	useGraphQL,
	useInfiniteGraphQL,
	usePagedMediaQuery,
	usePrefetchMediaPaged,
	useSDK,
} from '@stump/client'
import { usePrevious, usePreviousIsDifferent } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react'
import { Helmet } from 'react-helmet'

import { BookTable } from '@/components/book'
import BookGrid from '@/components/book/BookGrid'
import { defaultBookColumnSort } from '@/components/book/table'
import {
	FilterContext,
	FilterHeader,
	URLFilterContainer,
	URLFilterDrawer,
	URLOrdering,
	useFilterScene,
} from '@/components/filters'
import { useURLPageParams } from '@/components/filters/useFilterScene'
import EntityTableColumnConfiguration from '@/components/table/EntityTableColumnConfiguration'
import TableOrGridLayout from '@/components/TableOrGridLayout'
import useIsInView from '@/hooks/useIsInView'
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
	query SeriesBooksScene($filter: JSON!, $pagination: Pagination!) {
		media(filter: $filter, pagination: $pagination) {
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

export const usePrefetchSeriesBooks = (id: string) => {
	const { sdk } = useSDK()
	const { pageSize } = useURLPageParams()

	const client = useQueryClient()
	return () =>
		client.prefetchQuery({
			queryKey: ['seriesBooks', id],
			queryFn: async () => {
				const response = await sdk.execute(query, {
					filter: {
						seriesId: { eq: id },
					},
					pagination: {
						offset: {
							page: 1,
							pageSize,
						},
					},
				})
				return response
			},
		})
}

export default function SeriesBooksSceneContainer() {
	return (
		<Suspense fallback={null}>
			<SeriesBooksScene />
		</Suspense>
	)
}

function SeriesBooksScene() {
	const { series } = useSeriesContext()
	const { page, pageSize } = useURLPageParams()

	const { data, isLoading } = useGraphQL(query, ['seriesBooks', series.id], {
		filter: {
			seriesId: { eq: series.id },
		},
		pagination: {
			offset: {
				page,
				pageSize,
			},
		},
	})

	return (
		<div className="flex flex-1 flex-col pb-4 md:pb-0">
			<Helmet>
				<title>Stump | {series.resolvedName || ''}</title>
			</Helmet>
			{/* <section ref={containerRef} id="grid-top-indicator" className="h-0" /> */}

			<div className="flex flex-1 px-4 pb-2 pt-4 md:pb-4">
				<BookGrid
					isLoading={isLoading}
					books={data?.media.nodes}
					// hasFilters={Object.keys(filters || {}).length > 0}
				/>
			</div>
		</div>
	)
}
