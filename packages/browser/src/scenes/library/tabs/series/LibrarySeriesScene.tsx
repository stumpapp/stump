import { useGraphQL, useSDK } from '@stump/client'
import { usePrevious } from '@stump/components'
import {
	InterfaceLayout,
	OrderDirection,
	SeriesFilterInput,
	SeriesModelOrdering,
	SeriesOrderBy,
} from '@stump/graphql'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet'
import { useShallow } from 'zustand/react/shallow'

import { DynamicCardGrid, GridSizeSlider } from '@/components/container'
import {
	FilterContext,
	FilterHeader,
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
} from '@/components/filters/useFilterScene'
import GenericEmptyState from '@/components/GenericEmptyState'
import { LibrarySeriesAlphabet } from '@/components/library'
import { LibrarySeriesCard, SeriesTable } from '@/components/series'
import { defaultSeriesColumnSort } from '@/components/series/table'
import { EntityTableColumnConfiguration } from '@/components/table'
import TableOrGridLayout from '@/components/TableOrGridLayout'
import useIsInView from '@/hooks/useIsInView'
import { usePreferences } from '@/hooks/usePreferences'
import { useSeriesLayout } from '@/stores/layout'

import { useLibraryContext } from '../../context'
import { getQueryKey, query, usePrefetchLibrarySeries } from './queries'

function useSeriesURLOrderBy(ordering: Ordering): SeriesOrderBy[] {
	return useMemo(() => {
		// check for undefined values
		if (!ordering || !ordering.orderBy || !ordering.direction) {
			return DEFAULT_SERIES_ORDER_BY
		}

		return [
			{
				series: {
					field: ordering.orderBy as SeriesModelOrdering,
					direction: ordering.direction as OrderDirection,
				},
			},
		] as SeriesOrderBy[]
	}, [ordering])
}

type LibrarySeriesSceneProps = {
	fixedFilters?: SeriesFilterInput[]
	layoutKeyPostfix?: string
}

export default function LibrarySeriesScene({
	fixedFilters,
	layoutKeyPostfix,
}: LibrarySeriesSceneProps) {
	const {
		library: { id, name },
	} = useLibraryContext()
	const layoutKey = `library-${id}-series${layoutKeyPostfix ? `-${layoutKeyPostfix}` : ''}`
	const { layoutMode, setLayout, columns, setColumns, persistedOrdering, setPersistedOrdering } =
		useSeriesLayout(
			layoutKey,
			useShallow((state) => ({
				columns: state.columns,
				layoutMode: state.layout,
				persistedOrdering: state.ordering,
				setColumns: state.setColumns,
				setLayout: state.setLayout,
				setPersistedOrdering: state.setOrdering,
			})),
		)
	const {
		filters: seriesFilters,
		ordering,
		pagination: { page, pageSize: pageSizeMaybeUndefined },
		setPage,
		...rest
	} = useFilterScene({ persistedOrdering, setPersistedOrdering })
	const pageSize = pageSizeMaybeUndefined || 20 // Fallback to 20 if pageSize is undefined, this should never happen since we set a default in the useFilterScene hook
	const filters = seriesFilters as SeriesFilterInput
	const orderBy = useSeriesURLOrderBy(ordering)
	const { search } = useURLKeywordSearch()
	const searchFilter = useSearchSeriesFilter(search)

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
			...(fixedFilters || []),
		],
		[fixedFilters, filters, startsWith],
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
					...(fixedFilters || []),
				],
				orderBy,
			})
		},
		[prefetch, id, pageSize, orderBy, filters, fixedFilters],
	)
	const { sdk } = useSDK()
	const { data, isLoading } = useGraphQL(
		query,
		getQueryKey(sdk.cacheKeys.librarySeries, id, page, pageSize, search, resolvedFilters, orderBy),
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
	const nodes = data?.series.nodes || []
	const pageInfo = data?.series.pageInfo || {
		__typename: 'OffsetPaginationInfo',
		totalPages: 1,
		currentPage: 1,
		pageSize: pageSize,
		pageOffset: (page - 1) * pageSize,
		zeroBased: false,
	}

	const [containerRef, isInView] = useIsInView<HTMLDivElement>()

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
						prefetch(id, {
							page,
							pageSize,
							filter: resolvedFilters,
							orderBy,
						})
					}}
				>
					<div className="px-4 pt-4 flex flex-1">
						{!!nodes.length && (
							<DynamicCardGrid
								count={nodes.length}
								renderItem={(index) => (
									<LibrarySeriesCard key={nodes[index]!.id} data={nodes[index]!} />
								)}
							/>
						)}
						{!nodes.length && !isLoading && (
							<div className="col-span-full grid flex-1 place-self-center">
								<GenericEmptyState
									title={
										Object.keys(filters || {}).length > 0
											? 'No series match your search'
											: "It doesn't look like there are any series here"
									}
									subtitle={
										Object.keys(filters || {}).length > 0
											? 'Try removing some filters to see more series'
											: 'Do you have any series in your library?'
									}
								/>
							</div>
						)}
					</div>
				</URLFilterContainer>
			)
		} else {
			return (
				<SeriesTable
					layoutKey={layoutKey}
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
			<div className="pb-4 md:pb-0 flex flex-1 flex-col">
				<Helmet>
					<title>Stump | {name}</title>
				</Helmet>

				<section ref={containerRef} id="grid-top-indicator" className="h-0" />

				<FilterHeader
					isSearching={isLoading}
					layoutControls={<TableOrGridLayout layout={layoutMode} setLayout={setLayout} />}
					orderControls={<URLOrdering entity="series" />}
					filterControls={<URLFilterDrawer entity="series" />}
					sizeControls={layoutMode === InterfaceLayout.Grid ? <GridSizeSlider /> : undefined}
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
