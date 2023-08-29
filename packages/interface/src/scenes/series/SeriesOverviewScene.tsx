import {
	useLayoutMode,
	usePagedMediaQuery,
	useSeriesByIdQuery,
	useSeriesMediaQuery,
} from '@stump/client'
import { useEffect } from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router'

import { useFilterContext } from '../../components/filters/context_new'
import FilterProvider from '../../components/filters/FilterProvider'
import Search from '../../components/filters/Search'
import MediaList from '../../components/media/MediaList'
import Pagination from '../../components/Pagination'
import SceneContainer from '../../components/SceneContainer'
import useIsInView from '../../hooks/useIsInView'
import { usePageParam } from '../../hooks/usePageParam'
import MediaGrid from './MediaGrid'
import SeriesOverviewTitleSection from './SeriesOverviewTitleSection'

// TODO: fix pagination
function SeriesOverviewScene() {
	const [containerRef, isInView] = useIsInView()

	const { page, setPage } = usePageParam()

	const seriesId = useParams<{ id: string }>()?.id
	if (!seriesId) {
		throw new Error('Series ID is required for this route.')
	}

	const { layoutMode } = useLayoutMode('SERIES')
	const { series, isLoading: isLoadingSeries } = useSeriesByIdQuery(seriesId)
	const { filters, setFilter, removeFilter } = useFilterContext()
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
			<section ref={containerRef} id="grid-top-indicator" className="h-1" />

			<header className="flex h-12 flex-col gap-2 px-4">
				<Search
					initialValue={filters?.search as string}
					placeholder="Search by media name or description"
					onChange={(value) => {
						if (value) {
							setFilter('search', value)
						} else {
							removeFilter('search')
						}
					}}
					isLoading={isRefetchingMedia}
				/>
			</header>

			<div className="flex w-full flex-col space-y-6 p-4">
				{hasStuff ? (
					<Pagination pages={total_pages} currentPage={current_page} onChangePage={setPage} />
				) : null}
				{layoutMode === 'GRID' ? (
					<MediaGrid isLoading={isLoadingMedia} media={media} />
				) : (
					<MediaList isLoading={isLoadingMedia} media={media} />
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
	return (
		<FilterProvider>
			<SeriesOverviewScene />
		</FilterProvider>
	)
}
