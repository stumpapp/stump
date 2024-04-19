import {
	prefetchPagedSeries,
	useLibraryByIdQuery,
	usePagedSeriesQuery,
	useVisitLibrary,
} from '@stump/client'
import { usePreviousIsDifferent } from '@stump/components'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router'
import { useMediaMatch } from 'rooks'

import { FilterProvider, FilterToolBar, useFilterContext } from '@/components/filters'
import Pagination from '@/components/Pagination'
import SeriesGrid from '@/components/series/SeriesGrid'
import SeriesList from '@/components/series/SeriesList'
import { useLayoutMode, usePageParam } from '@/hooks'
import useIsInView from '@/hooks/useIsInView'

export default function LibrarySeriesSceneWrapper() {
	return (
		<FilterProvider>
			<LibrarySeriesScene />
		</FilterProvider>
	)
}

function LibrarySeriesScene() {
	const is3XLScreenOrBigger = useMediaMatch('(min-width: 1600px)')

	const { id } = useParams()
	const { page, setPage } = usePageParam()

	const [containerRef, isInView] = useIsInView<HTMLDivElement>()

	if (!id) {
		throw new Error('Library id is required')
	}

	const { layoutMode } = useLayoutMode()

	const alreadyVisited = useRef(false)
	const { visitLibrary } = useVisitLibrary()

	const { isLoading, library } = useLibraryByIdQuery(id)

	const { filters } = useFilterContext()

	const params = useMemo(
		() => ({
			page,
			page_size: is3XLScreenOrBigger ? 40 : 20,
			params: {
				...filters,
				count_media: true,
				library: {
					id,
				},
			},
		}),
		[page, is3XLScreenOrBigger, filters, id],
	)
	const {
		isLoading: isLoadingSeries,
		isRefetching: isRefetchingSeries,
		series,
		pageData,
	} = usePagedSeriesQuery(params)

	const differentSearch = usePreviousIsDifferent(filters?.search as string)
	useEffect(() => {
		if (differentSearch) {
			setPage(1)
		}
	}, [differentSearch, setPage])

	const { current_page, total_pages } = pageData || {}

	const isOnFirstPage = current_page === 1
	const hasFilters = Object.keys(filters || {}).length > 0
	const hasStuff = total_pages !== undefined && current_page !== undefined

	const handlePrefetchPage = useCallback(
		(page: number) => {
			prefetchPagedSeries({
				...params,
				page,
			})
		},
		[params],
	)

	// TODO: detect if going from page > 1 to page = 1 and scroll to top
	useEffect(
		() => {
			if (!isInView && !isOnFirstPage) {
				containerRef.current?.scrollIntoView()
			}
		},

		// eslint-disable-next-line react-hooks/exhaustive-deps
		[pageData?.current_page, isOnFirstPage],
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
			return <SeriesGrid isLoading={isLoadingSeries} series={series} hasFilters={hasFilters} />
		} else {
			return <SeriesList isLoading={isLoadingSeries} series={series} />
		}
	}

	return (
		<>
			<Helmet>
				<title>Stump | {library.name}</title>
			</Helmet>

			<section ref={containerRef} id="grid-top-indicator" className="h-1" />

			<FilterToolBar
				isRefetching={isRefetchingSeries}
				searchPlaceholder="Search series in this library by name or description."
				entity="series"
				orderBy
			/>

			<div className="flex w-full flex-col gap-y-6">
				{hasStuff && (
					<Pagination
						pages={total_pages}
						currentPage={current_page}
						onChangePage={setPage}
						onPrefetchPage={handlePrefetchPage}
					/>
				)}
				<div className="px-4">{renderContent()}</div>
				{hasStuff && (
					<Pagination
						position="bottom"
						pages={total_pages}
						currentPage={current_page}
						onChangePage={setPage}
						onPrefetchPage={handlePrefetchPage}
					/>
				)}
			</div>
		</>
	)
}
