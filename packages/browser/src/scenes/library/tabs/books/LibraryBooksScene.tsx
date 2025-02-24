import { useDynamicSearch, usePrefetchMediaPaged, useQuery, useSDK } from '@stump/client'
import { usePreviousIsDifferent } from '@stump/components'
import { isMediaOrderBy, MediaFilter, MediaOrderBy, MediaSmartFilter } from '@stump/sdk'
import { useCallback, useEffect, useMemo } from 'react'
import { Helmet } from 'react-helmet'
import { useShallow } from 'zustand/react/shallow'

import { BookTable } from '@/components/book'
import BookGrid from '@/components/book/BookGrid'
import { defaultBookColumnSort } from '@/components/book/table'
import {
	FilterContext,
	FilterHeader as OldFilterHeader,
	URLFilterContainer,
	URLFilterDrawer,
	URLOrdering,
	useFilterScene,
} from '@/components/filters'
import { AlphabetContext } from '@/components/filters_/alphabet'
import FilterHeader from '@/components/filters_/FilterHeader'
import {
	FilterStoreProvider,
	intoBody,
	intoFullURLParams,
	useFilterStore,
	useSyncParams,
} from '@/components/filters_/store'
import { intoFormFilter } from '@/components/smartList/createOrUpdate'
import { EntityTableColumnConfiguration } from '@/components/table'
import TableOrGridLayout from '@/components/TableOrGridLayout'
import useIsInView from '@/hooks/useIsInView'
import { usePreferences } from '@/hooks/usePreferences'
import { useBooksLayout } from '@/stores/layout'

import { useLibraryContext } from '../../context'

function LibraryBooksScene() {
	const [containerRef, isInView] = useIsInView<HTMLDivElement>()

	const store = useFilterStore(
		useShallow((state) => ({
			bodyStore: state.bodyStore,
			mode: state.mode,
			urlStore: state.urlStore,
		})),
	)
	const params = useMemo(
		() => ({
			bodyParams: intoBody<MediaSmartFilter, MediaOrderBy>(store.bodyStore, isMediaOrderBy),
			urlParams: intoFullURLParams<MediaFilter, MediaOrderBy>(store.urlStore),
		}),
		[store],
	)

	const { prefetch } = usePrefetchMediaPaged()
	const { library } = useLibraryContext()
	const { layoutMode, setLayout, columns, setColumns } = useBooksLayout((state) => ({
		columns: state.columns,
		layoutMode: state.layout,
		setColumns: state.setColumns,
		setLayout: state.setLayout,
	}))
	// const {
	// 	filters,
	// 	ordering,
	// 	pagination: { page, page_size },
	// 	setPage,
	// 	...rest
	// } = useFilterScene()
	const { changePage, pagination } = useSyncParams()
	// const params = useMemo(
	// 	() => ({
	// 		page,
	// 		page_size,
	// 		params: {
	// 			...filters,
	// 			...ordering,
	// 			series: {
	// 				library: {
	// 					id: [library.id],
	// 				},
	// 			},
	// 		},
	// 	}),
	// 	[page, page_size, ordering, filters, library.id],
	// )
	// const {
	// 	isLoading: isLoadingMedia,
	// 	isRefetching: isRefetchingMedia,
	// 	// media,
	// 	// pageData,
	// } = usePagedMediaQuery(params)

	const {
		isLoading: isLoadingMedia,
		isRefetching: isRefetchingMedia,
		media,
		pageData,
	} = useDynamicSearch({
		mode: store.mode,
		...params,
	})

	const { current_page, total_pages } = pageData || {}

	// const differentSearch = usePreviousIsDifferent(filters?.search as string)
	// useEffect(() => {
	// 	if (differentSearch) {
	// 		changePage(1)
	// 	}
	// }, [differentSearch, changePage])

	const handlePrefetchPage = useCallback(
		(page: number) => {
			// prefetch({
			// 	...params,
			// 	page,
			// })
		},
		// [params, prefetch],
		[prefetch],
	)

	const shouldScroll = usePreviousIsDifferent(current_page)
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
		[isInView, shouldScroll],
	)

	const renderContent = () => {
		if (layoutMode === 'GRID') {
			return (
				<URLFilterContainer
					currentPage={current_page || 1}
					pages={total_pages || 1}
					onChangePage={changePage}
					onPrefetchPage={handlePrefetchPage}
				>
					<div className="flex flex-1 px-4 pb-2 pt-4 md:pb-4">
						<BookGrid
							isLoading={isLoadingMedia}
							books={media}
							// hasFilters={Object.keys(filters || {}).length > 0}
							hasFilters={false}
						/>
					</div>
				</URLFilterContainer>
			)
		} else {
			return (
				<BookTable
					items={media || []}
					render={(props) => (
						<URLFilterContainer
							currentPage={current_page || 1}
							pages={total_pages || 1}
							onChangePage={changePage}
							onPrefetchPage={handlePrefetchPage}
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
				filters: {},
				ordering: {},
				pagination,
				setPage: changePage,
			}}
		>
			<div className="flex flex-1 flex-col pb-4 md:pb-0">
				<Helmet>
					<title>Stump | {library.name || ''}</title>
				</Helmet>

				<section ref={containerRef} id="grid-top-indicator" className="h-0" />

				{/* <OldFilterHeader
					isSearching={isRefetchingMedia}
					layoutControls={<TableOrGridLayout layout={layoutMode} setLayout={setLayout} />}
					orderControls={<URLOrdering entity="media" />}
					filterControls={<URLFilterDrawer entity="media" />}
					navOffset
				/> */}

				<FilterHeader
					layoutControls={<TableOrGridLayout layout={layoutMode} setLayout={setLayout} />}
					navOffset
					isSearching={isRefetchingMedia}
				/>

				{renderContent()}
			</div>
		</FilterContext.Provider>
	)
}

export default function LibraryBooksSceneContainer() {
	const { library } = useLibraryContext()
	const { sdk } = useSDK()
	const {
		preferences: { enable_alphabet_select },
	} = usePreferences()
	const { data: alphabet = {} } = useQuery(
		[sdk.library.keys.alphabet, library.id, { for: 'media' }],
		() => sdk.library.alphabet(library.id, { for: 'media' }),
		{
			cacheTime: 1000 * 60 * 60, // 1 hour
			enabled: enable_alphabet_select,
		},
	)

	const defaultFilter = useMemo<MediaSmartFilter>(
		() => ({
			series: {
				library: {
					id: {
						equals: library.id,
					},
				},
			},
		}),
		[library.id],
	)

	const defaultUrl = useMemo<MediaFilter>(
		() => ({
			series: {
				library: {
					id: [library.id],
				},
			},
		}),
		[library.id],
	)

	return (
		<AlphabetContext.Provider value={{ alphabet }}>
			<FilterStoreProvider
				forEntity="media"
				defaultBodyFilters={[
					{
						filters: [intoFormFilter(defaultFilter)],
						is_locked: true,
						joiner: 'and',
					},
				]}
				defaultURLFilters={defaultUrl}
			>
				<LibraryBooksScene />
			</FilterStoreProvider>
		</AlphabetContext.Provider>
	)
}
