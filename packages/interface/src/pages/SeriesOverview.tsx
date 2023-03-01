import { Box, ButtonGroup, Heading, Spacer } from '@chakra-ui/react'
import { getSeriesThumbnail } from '@stump/api'
import { useLayoutMode, useSeries, useSeriesMedia, useTopBarStore } from '@stump/client'
import { invalidateQueries } from '@stump/client/invalidate'
import { QUERY_KEYS } from '@stump/client/query_keys'
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
		<div className="p-4 flex items-start space-x-4">
			<div>
				<Box shadow="base" bg="gray.50" _dark={{ bg: 'gray.750' }} rounded="md" maxW="16rem">
					<Box px={1.5}>
						<img
							className="min-h-96 object-cover w-full [aspect-ratio:663/1024]"
							src={getSeriesThumbnail(series.id)}
						/>
					</Box>
				</Box>
			</div>
			<div className="flex-1 flex flex-col space-y-4 h-full">
				<Heading size="sm" noOfLines={1}>
					{series.name}
				</Heading>
				<ButtonGroup>
					<UpNextInSeriesButton seriesId={series.id} />
					<DownloadSeriesButton seriesId={series.id} />
				</ButtonGroup>

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

	const setBackwardsUrl = useTopBarStore((state) => state.setBackwardsUrl)

	const { layoutMode } = useLayoutMode('SERIES')
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
			// FIXME: why do I need to do this??? What I found was happening was that
			// the next series returned from `useSeries` would be ~correct~ BUT it would
			// be wrapped in an axios response, i.e. `{ data: { ... } }`. This doesn't make a
			// lick of sense to me yet...
			invalidateQueries({ keys: [QUERY_KEYS.series.get_by_id] })
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
			<div className="p-4 w-full h-full flex flex-col space-y-6">
				{hasStuff ? <Pagination pages={total_pages} currentPage={current_page} /> : null}
				{layoutMode === 'GRID' ? (
					<MediaGrid isLoading={isLoadingMedia} media={media} />
				) : (
					<MediaList isLoading={isLoadingMedia} media={media} />
				)}

				{/* FIXME: spacing when empty */}
				<Spacer />

				{hasStuff ? (
					<Pagination position="bottom" pages={total_pages} currentPage={current_page} />
				) : null}
			</div>
		</div>
	)
}
