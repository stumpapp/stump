import { PREFETCH_STALE_TIME, useSDK, useSuspenseGraphQL } from '@stump/client'
import { usePrevious, usePreviousIsDifferent } from '@stump/components'
import { graphql, InterfaceLayout, MediaFilterInput, MediaOrderBy } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet'

import { BookTable } from '@/components/book'
import BookCard from '@/components/book/BookCard'
import { defaultBookColumnSort } from '@/components/book/table'
import { DynamicCardGrid, GridSizeSlider } from '@/components/container'
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
	useMediaURLOrderBy,
	useSearchMediaFilter,
	useURLKeywordSearch,
	useURLPageParams,
} from '@/components/filters/useFilterScene'
import GenericEmptyState from '@/components/GenericEmptyState'
import { LibraryBooksAlphabet, usePrefetchLibraryBooksAlphabet } from '@/components/library'
import { EntityTableColumnConfiguration } from '@/components/table'
import TableOrGridLayout from '@/components/TableOrGridLayout'
import useIsInView from '@/hooks/useIsInView'
import { usePreferences } from '@/hooks/usePreferences'
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
	filter: FilterInput[]
	orderBy: MediaOrderBy[]
}

export const usePrefetchLibraryBooks = () => {
	const { sdk } = useSDK()
	const { pageSize } = useURLPageParams()
	const { search } = useURLKeywordSearch()
	const searchFilter = useSearchMediaFilter(search)

	const client = useQueryClient()
	const prefetchAlphabet = usePrefetchLibraryBooksAlphabet()

	const prefetch = useCallback(
		(
			id: string,
			params: UsePrefetchLibraryBooksParams = { filter: [], orderBy: DEFAULT_MEDIA_ORDER_BY },
		) => {
			const pageParams = { page: params.page || 1, pageSize: params.pageSize || pageSize }
			return Promise.all([
				client.prefetchQuery({
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
				}),
				prefetchAlphabet(id),
			])
		},
		[client, pageSize, search, searchFilter, sdk, prefetchAlphabet],
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

// TODO: This is used multiple times, let's generalize it
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

	const [startsWith, setStartsWith] = useState<string | undefined>(undefined)
	const onSelectLetter = useCallback(
		(letter?: string) => {
			setStartsWith(letter)
			setPage(1)
		},
		[setPage],
	)

	const [containerRef, isInView] = useIsInView<HTMLDivElement>()
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
	const prefetch = usePrefetchLibraryBooks()

	const onPrefetchLetter = useCallback(
		(letter: string) => {
			prefetch(library.id, {
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
		[prefetch, library.id, pageSize, orderBy, filters],
	)

	const { sdk } = useSDK()
	const {
		data: {
			media: { nodes, pageInfo },
		},
		isLoading,
	} = useSuspenseGraphQL(
		query,
		getQueryKey(
			sdk.cacheKeys.libraryBooks,
			library.id,
			page,
			pageSize,
			search,
			resolvedFilters,
			orderBy,
		),
		{
			filter: {
				series: {
					libraryId: { eq: library.id },
				},
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
		if (layoutMode === InterfaceLayout.Grid) {
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
							filter: resolvedFilters,
							orderBy,
						})
					}}
				>
					<div className="flex flex-1 px-4 pt-4">
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
									filter: resolvedFilters,
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
					sizeControls={layoutMode === InterfaceLayout.Grid ? <GridSizeSlider /> : undefined}
					navOffset
				/>

				{enableAlphabetSelect && (
					<LibraryBooksAlphabet
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
