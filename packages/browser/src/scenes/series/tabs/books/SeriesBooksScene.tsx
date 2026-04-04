import { PREFETCH_STALE_TIME, useGraphQL, useSDK } from '@stump/client'
import { usePrevious } from '@stump/components'
import { graphql, InterfaceLayout, MediaFilterInput, MediaOrderBy } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet'
import { useShallow } from 'zustand/react/shallow'

import { BookTable } from '@/components/book'
import BookCard from '@/components/book/BookCard'
import { defaultBookColumnSort } from '@/components/book/table'
import { DynamicCardGrid } from '@/components/container'
import {
	FilterContext,
	FilterHeader,
	URLFilterContainer,
	URLFilterDrawer,
	URLOrdering,
	useFilterScene,
} from '@/components/filters'
import {
	DEFAULT_MEDIA_ORDER_BY,
	useMediaURLOrderBy,
	useSearchMediaFilter,
	useURLKeywordSearch,
	useURLPageParams,
} from '@/components/filters/useFilterScene'
import GenericEmptyState from '@/components/GenericEmptyState'
import { SeriesBooksAlphabet } from '@/components/series'
import { EntityTableColumnConfiguration } from '@/components/table'
import TableOrGridLayout from '@/components/TableOrGridLayout'
import useIsInView from '@/hooks/useIsInView'
import { usePreferences } from '@/hooks/usePreferences'
import { useBooksLayout } from '@/stores/layout'

import { useSeriesContext } from '../../context'

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

export const usePrefetchSeriesBooks = () => {
	const { sdk } = useSDK()
	const { pageSize } = useURLPageParams()
	const { search } = useURLKeywordSearch()
	const searchFilter = useSearchMediaFilter(search)

	const client = useQueryClient()

	const prefetch = useCallback(
		(
			id: string,
			params: UsePrefetchSeriesBooksParams = { filter: [], orderBy: DEFAULT_MEDIA_ORDER_BY },
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
	filters: MediaFilterInput[] | undefined,
	orderBy: MediaOrderBy[] | undefined,
): (string | object | number | MediaFilterInput[] | MediaOrderBy[] | undefined)[] {
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

	const previous = usePrevious(search)
	const differentSearch = previous != null && search !== previous
	useEffect(() => {
		if (differentSearch) {
			setPage(1)
		}
	}, [differentSearch, setPage])

	const [startsWith, setStartsWith] = useState<string | undefined>(undefined)
	const onSelectLetter = useCallback(
		(letter?: string) => {
			setStartsWith(letter)
			setPage(1)
		},
		[setPage],
	)

	const prefetch = usePrefetchSeriesBooks()
	const layoutKey = `library-${series.library.id}-seriesBooks`

	const {
		preferences: { enableAlphabetSelect },
	} = usePreferences()
	const { layoutMode, setLayout, columns, setColumns } = useBooksLayout(
		layoutKey,
		useShallow((state) => ({
			columns: state.columns,
			layoutMode: state.layout,
			setColumns: state.setColumns,
			setLayout: state.setLayout,
		})),
	)

	const resolvedFilters = useMemo(
		() => [
			filters,
			...(startsWith
				? [
						{
							_or: [
								{ name: { startsWith } },
								{
									metadata: { title: { startsWith } },
								},
							],
						},
					]
				: []),
		],
		[filters, startsWith],
	)

	const onPrefetchLetter = useCallback(
		(letter: string) => {
			prefetch(series.id, {
				page: 1,
				pageSize,
				filter: [
					filters,
					{
						_or: [
							{ name: { startsWith: letter } },
							{ metadata: { title: { startsWith: letter } } },
						],
					},
				],
				orderBy,
			})
		},
		[prefetch, series.id, pageSize, orderBy, filters],
	)

	const { sdk } = useSDK()
	const { data, isLoading } = useGraphQL(
		query,
		getQueryKey(
			sdk.cacheKeys.seriesBooks,
			series.id,
			page,
			pageSize,
			search,
			resolvedFilters,
			orderBy,
		),
		{
			filter: {
				seriesId: { eq: series.id },
				_and: resolvedFilters,
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

	const nodes = data?.media.nodes || []
	const pageInfo = data?.media.pageInfo || {
		__typename: 'OffsetPaginationInfo',
		currentPage: 1,
		totalPages: 1,
		pageSize,
		pageOffset: (page - 1) * pageSize,
		zeroBased: false,
	}

	if (pageInfo.__typename !== 'OffsetPaginationInfo') {
		throw new Error('Invalid pagination type, expected OffsetPaginationInfo')
	}

	const previousPage = usePrevious(pageInfo.currentPage)
	const shouldScroll = !!previousPage && previousPage !== pageInfo.currentPage
	useEffect(() => {
		if (!isInView && shouldScroll) {
			containerRef.current?.scrollIntoView({
				behavior: 'smooth',
				block: 'nearest',
				inline: 'start',
			})
		}
	}, [shouldScroll, isInView, containerRef])

	const renderContent = () => {
		if (layoutMode === InterfaceLayout.Grid) {
			return (
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
							filter: [filters],
							orderBy: orderBy,
						})
					}}
				>
					<div className="px-4 pt-4 flex flex-1">
						{!!nodes.length && (
							<DynamicCardGrid
								count={nodes.length}
								renderItem={(index) => <BookCard key={nodes[index]!.id} fragment={nodes[index]!} />}
							/>
						)}
						{!nodes.length && !isLoading && (
							<div className="col-span-full grid flex-1 place-self-center">
								<GenericEmptyState
									title={
										Object.keys(filters || {}).length > 0
											? 'No books match your search'
											: "It doesn't look like there are any books here"
									}
									subtitle={
										Object.keys(filters || {}).length > 0
											? 'Try removing some filters to see more books'
											: 'Do you have any books in your library?'
									}
								/>
							</div>
						)}
					</div>
				</URLFilterContainer>
			)
		} else {
			return (
				<BookTable
					layoutKey={layoutKey}
					items={nodes || []}
					render={(props) => (
						<URLFilterContainer
							currentPage={pageInfo.currentPage || 1}
							pages={pageInfo.totalPages || 1}
							onChangePage={setPage}
							onPrefetchPage={(page) => {
								prefetch(series.id, {
									page,
									pageSize,
									filter: resolvedFilters,
									orderBy: orderBy,
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
			<div className="pb-4 md:pb-0 flex flex-1 flex-col">
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

				{enableAlphabetSelect && (
					<SeriesBooksAlphabet
						startsWith={startsWith}
						onSelectLetter={onSelectLetter}
						onPrefetchLetter={onPrefetchLetter}
					/>
				)}

				{renderContent()}
			</div>
		</FilterContext.Provider>
	)
}
