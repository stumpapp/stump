import { getSeriesThumbnail } from '@stump/api'
import { useLayoutMode, useSeriesByIdQuery, useSeriesMedia } from '@stump/client'
import { EntityCard, Heading, Spacer } from '@stump/components'
import type { Series } from '@stump/types'
import { useEffect } from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router-dom'

import MediaList from '../../components/media/MediaList'
import Pagination from '../../components/Pagination'
import ReadMore from '../../components/ReadMore'
import SceneContainer from '../../components/SceneContainer'
import TagList from '../../components/tags/TagList'
import { useGetPage } from '../../hooks/useGetPage'
import useIsInView from '../../hooks/useIsInView'
import DownloadSeriesButton from './DownloadSeriesButton'
import MediaGrid from './MediaGrid'
import SeriesLibraryLink from './SeriesLibraryLink'
import UpNextInSeriesButton from './UpNextInSeriesButton'

export default function SeriesOverviewScene() {
	const [containerRef, isInView] = useIsInView()

	const { id } = useParams()
	const { page } = useGetPage()

	if (!id) {
		throw new Error('Series id is required')
	}

	const { layoutMode } = useLayoutMode('SERIES')
	const { series, isLoading: isLoadingSeries } = useSeriesByIdQuery(id)
	const { isLoading: isLoadingMedia, media, pageData } = useSeriesMedia(id, page)

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

			<OverviewTitleSection series={series} isVisible={pageData?.current_page === 1} />

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

interface OverviewTitleSectionProps {
	isVisible: boolean
	series: Series
}

function OverviewTitleSection({ isVisible, series }: OverviewTitleSectionProps) {
	if (!isVisible) {
		return null
	}

	return (
		<div className="flex flex-1 items-start space-x-4 p-4">
			<EntityCard imageUrl={getSeriesThumbnail(series.id)} size="lg" fullWidth={false} />

			<div className="flex flex-1 flex-col gap-3">
				<div>
					<Heading size="sm">{series.name}</Heading>
					<SeriesLibraryLink id={series.library_id} />
				</div>
				<div className="flex items-center gap-2">
					<UpNextInSeriesButton seriesId={series.id} />
					<DownloadSeriesButton seriesId={series.id} />
				</div>

				<ReadMore text={series.description} />
				<TagList tags={series.tags} />
			</div>
		</div>
	)
}
