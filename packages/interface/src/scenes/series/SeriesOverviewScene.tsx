import { useLayoutMode, usePagedMediaQuery, useSeriesByIdQuery } from '@stump/client'
import { useEffect } from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router'
import { useMediaMatch } from 'rooks'

import { FilterProvider, FilterToolBar, useFilterContext } from '@/components/filters'
import MediaList from '@/components/media/MediaList'
import Pagination from '@/components/Pagination'
import SceneContainer from '@/components/SceneContainer'
import useIsInView from '@/hooks/useIsInView'
import { usePageParam } from '@/hooks/usePageParam'

import { SeriesContext, useSeriesContext } from './context'
import MediaGrid from './MediaGrid'
import SeriesOverviewTitleSection from './SeriesOverviewTitleSection'

// TODO: fix pagination
function SeriesOverviewScene() {
	const is3XLScreenOrBigger = useMediaMatch('(min-width: 1600px)')

	const [containerRef, isInView] = useIsInView()

	const { page, setPage } = usePageParam()
	const { seriesId } = useSeriesContext()

	const { layoutMode } = useLayoutMode('SERIES')
	const { series, isLoading: isLoadingSeries } = useSeriesByIdQuery(seriesId)
	const { filters } = useFilterContext()
	const {
		isLoading: isLoadingMedia,
		isRefetching: isRefetchingMedia,
		media,
		pageData,
	} = usePagedMediaQuery({
		page,
		page_size: is3XLScreenOrBigger ? 40 : 20,
		params: {
			...filters,
			series: {
				id: seriesId,
			},
		},
	})

	const { current_page, total_pages } = pageData || {}
	const isOnFirstPage = current_page === 1
	const hasFilters = Object.keys(filters || {}).length > 0
	const hasStuff = total_pages !== undefined && current_page !== undefined
	// we show on the first page, but if there are filters and no stuff we show it
	const showOverview = isOnFirstPage || (hasFilters && !hasStuff)

	// TODO: detect if going from page > 1 to page = 1 and scroll to top
	useEffect(
		() => {
			if (!isInView && !isOnFirstPage) {
				containerRef.current?.scrollIntoView({
					block: 'nearest',
					inline: 'start',
				})
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[current_page, isOnFirstPage],
	)

	if (isLoadingSeries) {
		return null
	} else if (!series) {
		throw new Error('Series not found')
	}

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {series.name || ''}</title>
			</Helmet>

			{showOverview && <SeriesOverviewTitleSection series={series} />}

			{/* @ts-expect-error: wrong ref but is okay */}
			<section ref={containerRef} id="grid-top-indicator" className="h-1" />

			<FilterToolBar
				isRefetching={isRefetchingMedia}
				searchPlaceholder="Search media in series by name or description."
				entity="media"
				orderBy
			/>

			<div className="flex w-full flex-col space-y-6 pt-4">
				{hasStuff && (
					<Pagination pages={total_pages} currentPage={current_page} onChangePage={setPage} />
				)}
				{layoutMode === 'GRID' ? (
					<MediaGrid
						isLoading={isLoadingMedia}
						media={media}
						hasFilters={Object.keys(filters || {}).length > 0}
					/>
				) : (
					<MediaList
						isLoading={isLoadingMedia}
						media={media}
						hasFilters={Object.keys(filters || {}).length > 0}
					/>
				)}
				{hasStuff && (
					<Pagination
						position="bottom"
						pages={total_pages}
						currentPage={current_page}
						onChangePage={setPage}
					/>
				)}
			</div>
		</SceneContainer>
	)
}

export default function SeriesOverviewSceneWrapper() {
	const seriesId = useParams<{ id: string }>()?.id

	if (!seriesId) {
		throw new Error('Series ID is required for this route.')
	}

	return (
		<SeriesContext.Provider value={{ seriesId }}>
			<FilterProvider>
				<SeriesOverviewScene />
			</FilterProvider>
		</SeriesContext.Provider>
	)
}
