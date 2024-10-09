import {
	prefetchPagedSeries,
	useLibraryByIdQuery,
	usePagedSeriesQuery,
	useVisitLibrary,
} from '@stump/client'
import { usePrevious, usePreviousIsDifferent } from '@stump/components'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router'

import {
	FilterContext,
	FilterHeader,
	FilterProvider,
	URLFilterContainer,
	URLFilterDrawer,
	URLOrdering,
	useFilterScene,
} from '@/components/filters'
import { SeriesTable } from '@/components/series'
import SeriesGrid from '@/components/series/SeriesGrid'
import TableOrGridLayout from '@/components/TableOrGridLayout'
import useIsInView from '@/hooks/useIsInView'
import { useSeriesLayout } from '@/stores/layout'

export default function LibrarySeriesSceneWrapper() {
	return (
		<FilterProvider>
			<LibrarySeriesScene />
		</FilterProvider>
	)
}

function LibrarySeriesScene() {
	const alreadyVisited = useRef(false)

	const { id } = useParams()

	const [containerRef, isInView] = useIsInView<HTMLDivElement>()

	if (!id) {
		throw new Error('Library id is required')
	}

	const { visitLibrary } = useVisitLibrary()

	const { layoutMode, setLayout } = useSeriesLayout((state) => ({
		layoutMode: state.layout,
		setLayout: state.setLayout,
	}))
	const { isLoading, library } = useLibraryByIdQuery(id)
	const {
		filters,
		ordering,
		pagination: { page, page_size },
		setPage,
		...rest
	} = useFilterScene()

	const params = useMemo(
		() => ({
			page,
			page_size,
			params: {
				...filters,
				...ordering,
				count_media: true,
				library: {
					id,
				},
			},
		}),
		[page, page_size, filters, ordering, id],
	)
	const {
		isLoading: isLoadingSeries,
		isRefetching: isRefetchingSeries,
		series,
		pageData,
	} = usePagedSeriesQuery(params)
	const { current_page, total_pages } = pageData || {}

	const differentSearch = usePreviousIsDifferent(filters?.search as string)
	useEffect(() => {
		if (differentSearch) {
			setPage(1)
		}
	}, [differentSearch, setPage])

	const handlePrefetchPage = useCallback(
		(page: number) => {
			prefetchPagedSeries({
				...params,
				page,
			})
		},
		[params],
	)

	const previousPage = usePrevious(current_page)
	const shouldScroll = !!previousPage && previousPage !== current_page
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
		[shouldScroll],
	)

	useEffect(
		() => {
			if (library?.id && !alreadyVisited.current) {
				alreadyVisited.current = true
				visitLibrary(library.id)
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[library?.id],
	)

	if (isLoading) {
		return null
	} else if (!library) {
		throw new Error('Library not found')
	}

	const renderContent = () => {
		if (layoutMode === 'GRID') {
			return (
				<URLFilterContainer
					currentPage={current_page || 1}
					pages={total_pages || 1}
					onChangePage={setPage}
					onPrefetchPage={handlePrefetchPage}
				>
					<div className="flex flex-1 px-4 pb-2 pt-4 md:pb-4">
						<SeriesGrid
							isLoading={isLoadingSeries}
							series={series}
							hasFilters={Object.keys(filters || {}).length > 0}
						/>
					</div>
				</URLFilterContainer>
			)
		} else {
			return (
				<SeriesTable
					items={series || []}
					render={(props) => (
						<URLFilterContainer
							currentPage={current_page || 1}
							pages={total_pages || 1}
							onChangePage={setPage}
							onPrefetchPage={handlePrefetchPage}
							// tableControls={<BookTableColumnConfiguration />}
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
				pagination: { page, page_size },
				setPage,
				...rest,
			}}
		>
			<div className="flex flex-1 flex-col pb-4 md:pb-0">
				<Helmet>
					<title>Stump | {library.name}</title>
				</Helmet>

				<section ref={containerRef} id="grid-top-indicator" className="h-0" />

				<FilterHeader
					isSearching={isRefetchingSeries}
					layoutControls={<TableOrGridLayout layout={layoutMode} setLayout={setLayout} />}
					orderControls={<URLOrdering entity="series" />}
					filterControls={<URLFilterDrawer entity="series" />}
					navOffset
				/>

				{renderContent()}
			</div>
		</FilterContext.Provider>
	)
}
