import { useGraphQL, useSDK } from '@stump/client'
import { usePreviousIsDifferent } from '@stump/components'
import { InterfaceLayout, MediaFilterInput } from '@stump/graphql'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet'
import { useShallow } from 'zustand/react/shallow'

import { BookCard, BookTable } from '@/components/book'
import { defaultBookColumnSort } from '@/components/book/table'
import DynamicCardGrid from '@/components/container/DynamicCardGrid'
import { GridSizeSlider } from '@/components/container/GridSizeSlider'
import {
	FilterContext,
	FilterHeader,
	URLFilterContainer,
	URLFilterDrawer,
	URLOrdering,
	useFilterScene,
} from '@/components/filters'
import {
	useMediaURLOrderBy,
	useSearchMediaFilter,
	useURLKeywordSearch,
} from '@/components/filters/useFilterScene'
import GenericEmptyState from '@/components/GenericEmptyState'
import { LibraryBooksAlphabet } from '@/components/library'
import { EntityTableColumnConfiguration } from '@/components/table'
import TableOrGridLayout from '@/components/TableOrGridLayout'
import useIsInView from '@/hooks/useIsInView'
import { usePreferences } from '@/hooks/usePreferences'
import { useBooksLayout } from '@/stores/layout'

import { useLibraryContext } from '../../context'
import { getQueryKey, query, usePrefetchLibraryBooks } from './queries'

export default function LibraryBooksSceneContainer() {
	return (
		<Suspense fallback={null}>
			<LibraryBooksScene />
		</Suspense>
	)
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

	const layoutKey = `library-${library.id}-books`

	const { layoutMode, setLayout, columns, setColumns } = useBooksLayout(
		layoutKey,
		useShallow((state) => ({
			columns: state.columns,
			layoutMode: state.layout,
			setColumns: state.setColumns,
			setLayout: state.setLayout,
		})),
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
	const { data, isLoading } = useGraphQL(
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
	const nodes = data?.media.nodes || []
	const pageInfo = data?.media.pageInfo || {
		__typename: 'OffsetPaginationInfo',
		totalPages: 1,
		currentPage: 1,
		pageSize: pageSize,
		pageOffset: (page - 1) * pageSize,
		zeroBased: false,
	}

	if (pageInfo.__typename !== 'OffsetPaginationInfo') {
		throw new Error('Expected OffsetPaginationInfo for LibraryBooksScene')
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
						prefetch(library.id, {
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
			<div className="pb-4 md:pb-0 flex flex-1 flex-col">
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
