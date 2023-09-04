import { useLayoutMode, useLibraryByIdQuery, usePagedSeriesQuery } from '@stump/client'
import { usePreviousIsDifferent } from '@stump/components'
import { useEffect } from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router'

import { FilterProvider, FilterToolBar, useFilterContext } from '../../components/filters'
import Pagination from '../../components/Pagination'
import SceneContainer from '../../components/SceneContainer'
import SeriesGrid from '../../components/series/SeriesGrid'
import SeriesList from '../../components/series/SeriesList'
import useIsInView from '../../hooks/useIsInView'
import { usePageParam } from '../../hooks/usePageParam'
import LibraryOverviewTitleSection from './LibraryOverviewTitleSection'

function LibraryOverviewScene() {
	const { id } = useParams()
	const { page, setPage } = usePageParam()

	const [containerRef, isInView] = useIsInView<HTMLDivElement>()

	if (!id) {
		throw new Error('Library id is required')
	}

	const { layoutMode } = useLayoutMode('LIBRARY')
	const { isLoading, library } = useLibraryByIdQuery(id)

	const { filters } = useFilterContext()
	const {
		isLoading: isLoadingSeries,
		isRefetching: isRefetchingSeries,
		series,
		pageData,
	} = usePagedSeriesQuery({
		page,
		params: {
			...filters,
			count_media: true,
			library: {
				id,
			},
		},
	})

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
	// we show on the first page, but if there are filters and no stuff we show it
	const showOverview = isOnFirstPage || (hasFilters && !hasStuff)

	useEffect(
		() => {
			if (!isInView && !isOnFirstPage) {
				containerRef.current?.scrollIntoView()
			}
		},

		// eslint-disable-next-line react-hooks/exhaustive-deps
		[pageData?.current_page, isOnFirstPage],
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
		<SceneContainer>
			<Helmet>
				<title>Stump | {library.name}</title>
			</Helmet>

			<LibraryOverviewTitleSection library={library} isVisible={showOverview} />

			{/* @ts-expect-error: wrong ref, still okay */}
			<section ref={containerRef} id="grid-top-indicator" className="h-1" />

			<FilterToolBar
				isRefetching={isRefetchingSeries}
				searchPlaceholder="Search series in this library by name or description."
				slideOverForm="series"
			/>

			<div className="flex w-full flex-col space-y-6 p-4">
				{hasStuff && (
					<Pagination
						pages={total_pages}
						currentPage={current_page}
						onChangePage={(page) => setPage(page)}
					/>
				)}
				{renderContent()}
				{hasStuff && (
					<Pagination
						position="bottom"
						pages={total_pages}
						currentPage={current_page}
						onChangePage={(page) => setPage(page)}
					/>
				)}
			</div>
		</SceneContainer>
	)
}

export default function LibraryOverviewSceneWrapper() {
	return (
		<FilterProvider>
			<LibraryOverviewScene />
		</FilterProvider>
	)
}
