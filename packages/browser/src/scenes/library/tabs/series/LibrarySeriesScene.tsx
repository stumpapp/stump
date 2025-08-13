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
import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { LibrarySeriesAlphabet, usePrefetchLibrarySeriesAlphabet } from '@/components/library'
import { SeriesTable } from '@/components/series'
import SeriesGrid from '@/components/series/SeriesGrid'
import { defaultSeriesColumnSort } from '@/components/series/table'
import { EntityTableColumnConfiguration } from '@/components/table'
import TableOrGridLayout from '@/components/TableOrGridLayout'
import useIsInView from '@/hooks/useIsInView'
import { usePreferences } from '@/hooks/usePreferences'
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
	filter?: SeriesFilterInput[]
	orderBy: SeriesOrderBy[]
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
				}),
				prefetchAlphabet(libraryId),
			])
		},
		[pageSize, search, searchFilter, sdk, client, prefetchAlphabet],
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
	filters: SeriesFilterInput[] | undefined,
	orderBy: SeriesOrderBy[] | undefined,
): (string | object | number | SeriesFilterInput[] | SeriesOrderBy[] | undefined)[] {
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

	const [startsWith, setStartsWith] = useState<string | undefined>(undefined)
	const onSelectLetter = useCallback(
		(letter?: string) => {
			setStartsWith(letter)
			setPage(1)
		},
		[setPage],
	)

	const {
		preferences: { enableAlphabetSelect },
	} = usePreferences()

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
	const prefetch = usePrefetchLibrarySeries()

	const onPrefetchLetter = useCallback(
		(letter: string) => {
			prefetch(id, {
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
		[prefetch, id, pageSize, orderBy, filters],
	)

	const { layoutMode, setLayout, columns, setColumns } = useSeriesLayout((state) => ({
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
		[
			getQueryKey(
				sdk.cacheKeys.librarySeries,
				id,
				page,
				pageSize,
				search,
				resolvedFilters,
				orderBy,
			),
		],
		{
			filter: {
				libraryId: { eq: id },
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

	const [containerRef, isInView] = useIsInView<HTMLDivElement>()

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
					onChangePage={(page) => {
						setPage(page)
					}}
					onPrefetchPage={(page) => {
						prefetch(id, {
							page,
							pageSize,
							filter: resolvedFilters,
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
			)
		} else {
			return (
				<SeriesTable
					items={nodes || []}
					render={(props) => (
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
									filter: resolvedFilters,
									orderBy,
								})
							}}
							tableControls={
								<EntityTableColumnConfiguration
									entity="series"
									configuration={columns || defaultSeriesColumnSort}
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

				{enableAlphabetSelect && (
					<LibrarySeriesAlphabet
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
