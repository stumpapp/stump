// import { Box, ButtonGroup, Heading, Spacer } from '@chakra-ui/react'
import { getSeriesThumbnail } from '@stump/api'
import { useLayoutMode, useSeries, useSeriesMedia, useTopBarStore } from '@stump/client'
import { Heading } from '@stump/components'
import type { Series } from '@stump/types'
import { useEffect } from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router-dom'

import MediaGrid from '../components/media/MediaGrid'
import MediaList from '../components/media/MediaList'
import DownloadSeriesButton from '../components/series/DownloadSeriesButton'
import UpNextInSeriesButton from '../components/series/UpNextInSeriesButton'
import TagList from '../components/tags/TagList'
import { useGetPage } from '../hooks/useGetPage'
import useIsInView from '../hooks/useIsInView'
import Pagination from '../ui/Pagination'
import ReadMore from '../ui/ReadMore'

interface OverviewTitleSectionProps {
	isVisible: boolean
	series: Series
}

function OverviewTitleSection({ isVisible, series }: OverviewTitleSectionProps) {
	if (!isVisible) {
		return null
	}

	return (
		<div className="flex items-start space-x-4 p-4">
			<div>
				<div className="max-w-[16rem] rounded-md bg-gray-50 shadow dark:bg-gray-950">
					<div className="px-1.5">
						<img
							className="min-h-96 w-full object-cover [aspect-ratio:663/1024]"
							src={getSeriesThumbnail(series.id)}
						/>
					</div>
				</div>
			</div>
			<div className="flex h-full flex-1 flex-col space-y-4">
				{/* noOfLines={1} */}
				<Heading size="sm">{series.name}</Heading>
				{/* <ButtonGroup> */}
				<div className="flex items-center gap-2">
					<UpNextInSeriesButton seriesId={series.id} />
					<DownloadSeriesButton seriesId={series.id} />
				</div>

				<ReadMore text={series.description} />

				{/* TODO: I want this at the bottom of the container here, but layout needs to be tweaked and I am tired. */}
				<TagList tags={series.tags} />
			</div>
		</div>
	)
}

export default function SeriesOverview() {
	const [containerRef, isInView] = useIsInView()

	const { id } = useParams()
	const { page } = useGetPage()

	if (!id) {
		throw new Error('Series id is required')
	}

	const { layoutMode } = useLayoutMode('SERIES')

	const setBackwardsUrl = useTopBarStore((state) => state.setBackwardsUrl)

	const { series, isLoading: isLoadingSeries } = useSeries(id)

	const { isLoading: isLoadingMedia, media, pageData } = useSeriesMedia(id, page)

	useEffect(() => {
		if (!isInView) {
			containerRef.current?.scrollIntoView({
				block: 'nearest',
				inline: 'start',
			})
		}
	}, [isInView, containerRef, pageData?.current_page])

	useEffect(() => {
		if (series) {
			setBackwardsUrl(`/libraries/${series.library_id}`)
		}

		return () => {
			setBackwardsUrl()
		}
	}, [series, setBackwardsUrl])

	// FIXME: ugly
	if (isLoadingSeries) {
		return <div>Loading...</div>
	} else if (!series) {
		throw new Error('Series not found')
	}

	const { current_page, total_pages } = pageData || {}
	const hasStuff = current_page !== undefined && total_pages !== undefined

	return (
		<div className="h-full w-full">
			<Helmet>
				<title>Stump | {series.name || ''}</title>
			</Helmet>

			<OverviewTitleSection series={series} isVisible={pageData?.current_page === 1} />

			{/* @ts-expect-error: wrong ref but is okay */}
			<section ref={containerRef} id="grid-top-indicator" className="h-0" />
			<div className="flex h-full w-full flex-col space-y-6 p-4">
				{hasStuff ? <Pagination pages={total_pages} currentPage={current_page} /> : null}
				{layoutMode === 'GRID' ? (
					<MediaGrid isLoading={isLoadingMedia} media={media} />
				) : (
					<MediaList isLoading={isLoadingMedia} media={media} />
				)}

				{/* FIXME: spacing when empty */}
				{/* <Spacer /> */}
				<div className="flex-1" />

				{hasStuff ? (
					<Pagination position="bottom" pages={total_pages} currentPage={current_page} />
				) : null}
			</div>
		</div>
	)
}
