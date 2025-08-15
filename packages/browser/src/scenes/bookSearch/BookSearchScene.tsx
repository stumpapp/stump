import { PREFETCH_STALE_TIME, useSDK, useSuspenseGraphQL } from '@stump/client'
import { usePrevious, usePreviousIsDifferent } from '@stump/components'
import {
	graphql,
	MediaFilterInput,
	MediaModelOrdering,
	MediaOrderBy,
	OrderDirection,
} from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet'

import { BookTable } from '@/components/book'
import BookCard from '@/components/book/BookCard'
import BookGrid from '@/components/book/BookGrid'
import { defaultBookColumnSort } from '@/components/book/table'
import {
	FilterHeader,
	URLFilterContainer,
	URLFilterDrawer,
	URLOrdering,
	useFilterScene,
} from '@/components/filters'
import { FilterContext, FilterInput, Ordering } from '@/components/filters/context'
import {
	DEFAULT_MEDIA_ORDER_BY,
	useSearchMediaFilter,
	useURLKeywordSearch,
	useURLPageParams,
} from '@/components/filters/useFilterScene'
import { EntityTableColumnConfiguration } from '@/components/table'
import TableOrGridLayout from '@/components/TableOrGridLayout'
import useIsInView from '@/hooks/useIsInView'
import { usePreferences } from '@/hooks/usePreferences'
import { useBooksLayout } from '@/stores/layout'

import BooksAlphabet from '../book/BooksAlphabet'

const query = graphql(`
	query BookSearchScene(
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

export type UsePrefetchBookSearchParams = {
	page?: number
	pageSize?: number
	filter: FilterInput[]
	orderBy: MediaOrderBy[]
}

export const usePrefetchBookSearch = () => {
	const { sdk } = useSDK()
	const { pageSize } = useURLPageParams()
	const { search } = useURLKeywordSearch()
	const searchFilter = useSearchMediaFilter(search)

	const client = useQueryClient()

	const prefetch = useCallback(
		(params: UsePrefetchBookSearchParams = { filter: {}, orderBy: DEFAULT_MEDIA_ORDER_BY }) => {
			const pageParams = { page: params.page || 1, pageSize: params.pageSize || pageSize }
			return client.prefetchQuery({
				queryKey: getQueryKey(
					pageParams.page,
					pageParams.pageSize,
					search,
					params.filter,
					params.orderBy,
				),
				queryFn: async () => {
					const response = await sdk.execute(query, {
						filter: {
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

export default function BookSearchSceneContainer() {
	return (
		<Suspense fallback={null}>
			<BookSearchScene />
		</Suspense>
	)
}

function getQueryKey(
	page: number,
	pageSize: number,
	search: string | undefined,
	filters: FilterInput[],
	orderBy: MediaOrderBy[],
) {
	return ['booksSearch', { page, pageSize, search, filters, orderBy }]
}

export function useMediaURLOrderBy(ordering: Ordering): MediaOrderBy[] {
	return useMemo(() => {
		// check for undefined values
		if (!ordering || !ordering.order_by || !ordering.direction) {
			return DEFAULT_MEDIA_ORDER_BY
		}

		return [
			{
				media: {
					field: ordering.order_by as MediaModelOrdering,
					direction: ordering.direction as OrderDirection,
				},
			},
		] as MediaOrderBy[]
	}, [ordering])
}

function BookSearchScene() {
	const [containerRef, isInView] = useIsInView<HTMLDivElement>()
	const {
		filters: mediaFilters,
		ordering,
		pagination: { page, pageSize: pageSizeMaybeUndefined },
		setPage,
		...rest
	} = useFilterScene()
	const filters = mediaFilters as MediaFilterInput
	const { search } = useURLKeywordSearch()
	const searchFilter = useSearchMediaFilter(search)

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

	const { layoutMode, setLayout, columns, setColumns } = useBooksLayout((state) => ({
		columns: state.columns,
		layoutMode: state.layout,
		setColumns: state.setColumns,
		setLayout: state.setLayout,
	}))

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

	const prefetch = usePrefetchBookSearch()

	const pageSize = pageSizeMaybeUndefined || 20 // Fallback to 20 if pageSize is undefined, this should never happen since we set a default in the useFilterScene hook
	const orderBy = useMediaURLOrderBy(ordering)

	const onPrefetchLetter = useCallback(
		(letter: string) => {
			prefetch({
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
		[prefetch, pageSize, orderBy, filters],
	)

	const {
		data: {
			media: { nodes, pageInfo },
		},
		isLoading,
	} = useSuspenseGraphQL(query, getQueryKey(page, pageSize, search, resolvedFilters, orderBy), {
		filter: {
			_and: resolvedFilters,
			_or: searchFilter,
		},
		orderBy: orderBy,
		pagination: {
			offset: {
				page,
				pageSize: pageSize,
			},
		},
	})
	const cards = nodes.map((node) => <BookCard key={node.id} fragment={node} />)
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
							filter: resolvedFilters,
							orderBy,
						})
					}}
				>
					<div className="flex flex-1 px-4 pb-2 pt-4 md:pb-4">
						<BookGrid
							isLoading={isLoading}
							items={cards}
							hasFilters={
								Object.keys(filters).length > 0 || Object.keys(filters?.metadata || {}).length > 0
							}
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
							onChangePage={setPage}
							onPrefetchPage={(page) => {
								prefetch({
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
					<title>Stump | Books</title>
				</Helmet>

				<section ref={containerRef} id="grid-top-indicator" className="h-0" />

				<FilterHeader
					isSearching={isLoading}
					layoutControls={<TableOrGridLayout layout={layoutMode} setLayout={setLayout} />}
					orderControls={<URLOrdering entity="media" />}
					filterControls={<URLFilterDrawer entity="media" />}
				/>

				{enableAlphabetSelect && (
					<BooksAlphabet
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
