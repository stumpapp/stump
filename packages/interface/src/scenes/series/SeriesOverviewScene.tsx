import { useLayoutMode, usePagedMediaQuery, useSeriesByIdQuery } from '@stump/client'
import { useEffect } from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router'

import { FilterProvider, FilterToolBar, useFilterContext } from '../../components/filters'
import MediaList from '../../components/media/MediaList'
import Pagination from '../../components/Pagination'
import SceneContainer from '../../components/SceneContainer'
import useIsInView from '../../hooks/useIsInView'
import { usePageParam } from '../../hooks/usePageParam'
import { SeriesContext, useSeriesContext } from './context'
import MediaGrid from './MediaGrid'
import SeriesOverviewTitleSection from './SeriesOverviewTitleSection'

// TODO: fix pagination
function SeriesOverviewScene() {
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
		params: {
			...filters,
			series: {
				id: seriesId,
			},
		},
	})

	useEffect(() => {
		if (!isInView && pageData?.current_page !== 1) {
			containerRef.current?.scrollIntoView({
				block: 'nearest',
				inline: 'start',
			})
		}
	}, [isInView, containerRef, pageData?.current_page])

	if (isLoadingSeries) {
		return null
	} else if (!series) {
		throw new Error('Series not found')
	}

	const { current_page, total_pages } = pageData || {}
	const hasStuff = current_page !== undefined && total_pages !== undefined

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {series.name || ''}</title>
			</Helmet>

			<SeriesOverviewTitleSection series={series} isVisible={pageData?.current_page === 1} />

			{/* @ts-expect-error: wrong ref but is okay */}
			<section ref={containerRef} id="grid-top-indicator" className="h-1" />

			<FilterToolBar
				isRefetching={isRefetchingMedia}
				searchPlaceholder="Search media in series by name or description."
				slideOverForm="media"
			/>

			<div className="flex w-full flex-col space-y-6 p-4">
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
