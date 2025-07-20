import { PREFETCH_STALE_TIME, useSDK, useSuspenseGraphQL } from '@stump/client'
import { usePrevious, usePreviousIsDifferent } from '@stump/components'
import { graphql, MediaFilterInput, MediaOrderBy } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Suspense, useCallback, useEffect } from 'react'
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
import { FilterInput } from '@/components/filters/context'
import {
	DEFAULT_MEDIA_ORDER_BY,
	useSearchMediaFilter,
	useURLKeywordSearch,
	useURLPageParams,
} from '@/components/filters/useFilterScene'
import { EntityTableColumnConfiguration } from '@/components/table'
import TableOrGridLayout from '@/components/TableOrGridLayout'
import useIsInView from '@/hooks/useIsInView'
import { useMediaURLOrderBy } from '@/scenes/bookSearch/BookSearchScene'
import { useBooksLayout } from '@/stores/layout'

import { useLibraryContext } from '../../context'

const query = graphql(`
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
	filter: FilterInput
	orderBy: MediaOrderBy[]
}

export const usePrefetchLibraryBooks = () => {
	const { sdk } = useSDK()
	const { pageSize } = useURLPageParams()
	const { search } = useURLKeywordSearch()
	const searchFilter = useSearchMediaFilter(search)

	const client = useQueryClient()

	const prefetch = useCallback(
		(
			id: string,
			params: UsePrefetchLibraryBooksParams = { filter: {}, orderBy: DEFAULT_MEDIA_ORDER_BY },
		) => {
			const pageParams = { page: params.page || 1, pageSize: params.pageSize || pageSize }
			return client.prefetchQuery({
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
		[client, pageSize, search, searchFilter, sdk],
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

function LibraryBooksScene() {
	const { library } = useLibraryContext()
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

	const differentSearch = usePreviousIsDifferent(search)
	useEffect(() => {
		if (differentSearch) {
			setPage(1)
		}
	}, [differentSearch, setPage])

	const [containerRef, isInView] = useIsInView<HTMLDivElement>()
	const { layoutMode, setLayout, columns, setColumns } = useBooksLayout((state) => ({
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
		getQueryKey(sdk.cacheKeys.libraryBooks, library.id, page, pageSize, search, filters, orderBy),
		{
			filter: {
				series: {
					libraryId: { eq: library.id },
				},
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

	const renderContent = () => {
		if (layoutMode === 'GRID') {
			return (
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
							filter: filters,
							orderBy,
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
			)
		} else {
			return (
				<BookTable
					items={nodes || []}
					render={(props) => (
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
									filter: filters,
									orderBy,
								})
							}}
							tableControls={
								<EntityTableColumnConfiguration
									entity="media"
									configuration={columns || defaultBookColumnSort}
									onSave={setColumns}
								/>
							}
							{...props}
						/>
					)}
				/>
			)
		}
	}
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
					<title>Stump | {library.name || ''}</title>
				</Helmet>

				<section ref={containerRef} id="grid-top-indicator" className="h-0" />

				<FilterHeader
					isSearching={isLoading}
					layoutControls={<TableOrGridLayout layout={layoutMode} setLayout={setLayout} />}
					orderControls={<URLOrdering entity="media" />}
					filterControls={<URLFilterDrawer entity="media" />}
					navOffset
				/>

				{renderContent()}
			</div>
		</FilterContext.Provider>
	)
}
