import { getSeriesThumbnail } from '@stump/api'
import { useLayoutMode, useSeriesByIdQuery, useSeriesMediaQuery } from '@stump/client'
import { EntityCard, Heading } from '@stump/components'
import type { Series } from '@stump/types'
import { useEffect } from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router-dom'

import MediaList from '../../components/media/MediaList'
import Pagination from '../../components/Pagination'
import SceneContainer from '../../components/SceneContainer'
import { useGetPage } from '../../hooks/useGetPage'
import useIsInView from '../../hooks/useIsInView'
import { useSeriesOverviewContext } from './context'
import MediaGrid from './MediaGrid'
import SeriesOverviewContextProvider from './SeriesOverviewContextProvider'
import SeriesOverviewTitleSection from './SeriesOverviewTitleSection'

function SeriesOverviewScene() {
	const [containerRef, isInView] = useIsInView()

	const { page } = useGetPage()

	const { seriesId, page_size, filters } = useSeriesOverviewContext()
	if (!seriesId) {
		throw new Error('Series ID is required for this route.')
	}

	const { layoutMode } = useLayoutMode('SERIES')
	const { series, isLoading: isLoadingSeries } = useSeriesByIdQuery(seriesId)
	const {
		isLoading: isLoadingMedia,
		media,
		pageData,
	} = useSeriesMediaQuery(seriesId, { filters, page, page_size })

	useEffect(() => {
		if (!isInView) {
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
			<section ref={containerRef} id="grid-top-indicator" className="h-0" />
			<div className="flex w-full flex-col space-y-6 p-4">
				{hasStuff ? <Pagination pages={total_pages} currentPage={current_page} /> : null}

				{layoutMode === 'GRID' ? (
					<MediaGrid isLoading={isLoadingMedia} media={media} />
				) : (
					<MediaList isLoading={isLoadingMedia} media={media} />
				)}

				{hasStuff && (
					<Pagination position="bottom" pages={total_pages} currentPage={current_page} />
				)}
			</div>
		</SceneContainer>
	)
}

export default function SeriesOverviewSceneWrapper() {
	const { id } = useParams()

	return (
		<SeriesOverviewContextProvider seriesId={id}>
			<SeriesOverviewScene />
		</SeriesOverviewContextProvider>
	)
}
