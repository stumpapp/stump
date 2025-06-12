import {
	PREFETCH_STALE_TIME,
	usePagedMediaQuery,
	usePrefetchMediaPaged,
	useSDK,
	useSuspenseGraphQL,
} from '@stump/client'
import { usePrevious, usePreviousIsDifferent } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Suspense, useCallback, useEffect, useMemo } from 'react'
import { Helmet } from 'react-helmet'

import { BookTable } from '@/components/book'
import BookCard from '@/components/book/BookCard'
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
import { EntityTableColumnConfiguration } from '@/components/table'
import TableOrGridLayout from '@/components/TableOrGridLayout'
import useIsInView from '@/hooks/useIsInView'
import { useBooksLayout } from '@/stores/layout'

import { useLibraryContext } from '../../context'

// export default function LibraryBooksScene() {
// 	const [containerRef, isInView] = useIsInView<HTMLDivElement>()

// 	const { prefetch } = usePrefetchMediaPaged()
// 	const { library } = useLibraryContext()
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
// 					library: {
// 						id: [library.id],
// 					},
// 				},
// 			},
// 		}),
// 		[page, page_size, ordering, filters, library.id],
// 	)
// 	const {
// 		isLoading: isLoadingMedia,
// 		isRefetching: isRefetchingMedia,
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
// 		[params, prefetch],
// 	)

// 	const shouldScroll = usePreviousIsDifferent(current_page)
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
// 		[isInView, shouldScroll],
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
// 			<div className="flex flex-1 flex-col pb-4 md:pb-0">
// 				<Helmet>
// 					<title>Stump | {library.name || ''}</title>
// 				</Helmet>

// 				<section ref={containerRef} id="grid-top-indicator" className="h-0" />

// 				<FilterHeader
// 					isSearching={isRefetchingMedia}
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
	query LibraryBooksScene($filter: MediaFilterInput!, $pagination: Pagination!) {
		media(filter: $filter, pagination: $pagination) {
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

export type UsePrefetchLibraryBooksParams = {
	page?: number
	pageSize?: number
}

export const usePrefetchLibraryBooks = () => {
	const { sdk } = useSDK()
	const { pageSize } = useURLPageParams()

	const client = useQueryClient()

	const prefetch = useCallback(
		(id: string, params: UsePrefetchLibraryBooksParams = {}) => {
			const pageParams = { page: params.page || 1, pageSize: params.pageSize || pageSize }
			return client.prefetchQuery({
				queryKey: ['libraryBooks', id, pageParams],
				queryFn: async () => {
					const response = await sdk.execute(query, {
						filter: {
							series: {
								libraryId: { eq: id },
							},
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
		[client, pageSize, sdk],
	)

	return prefetch
}

export default function LibraryBooksSceneContainer() {
	return (
		<Suspense fallback={null}>
			<LibraryBooksScene />
		</Suspense>
	)
}

function LibraryBooksScene() {
	const { library } = useLibraryContext()
	const { page, pageSize, setPage } = useURLPageParams()

	const [containerRef, isInView] = useIsInView<HTMLDivElement>()

	const {
		data: {
			media: { nodes, pageInfo },
		},
		isLoading,
	} = useSuspenseGraphQL(query, ['libraryBooks', library.id, { page, pageSize }], {
		filter: {
			series: {
				libraryId: { eq: library.id },
			},
		},
		pagination: {
			offset: {
				page,
				pageSize,
			},
		},
	})

	const prefetch = usePrefetchLibraryBooks()

	if (pageInfo.__typename !== 'OffsetPaginationInfo') {
		throw new Error('Expected OffsetPaginationInfo for LibraryBooksScene')
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
				<title>Stump | {library.name || ''}</title>
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
					prefetch(library.id, {
						page,
						pageSize,
					})
				}}
			>
				<div className="flex flex-1 px-4 pb-2 pt-4 md:pb-4">
					<BookGrid
						isLoading={isLoading}
						items={nodes.map((node) => (
							<BookCard key={node.id} fragment={node} />
						))}
						// hasFilters={Object.keys(filters || {}).length > 0}
					/>
				</div>
			</URLFilterContainer>
		</div>
	)
}
