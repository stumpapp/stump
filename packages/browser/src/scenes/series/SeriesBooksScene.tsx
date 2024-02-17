import { useLayoutMode, usePagedMediaQuery } from '@stump/client'
import { useEffect } from 'react'
import { Helmet } from 'react-helmet'
import { useMediaMatch } from 'rooks'

import { FilterProvider, FilterToolBar, useFilterContext } from '@/components/filters'
import MediaList from '@/components/media/MediaList'
import Pagination from '@/components/Pagination'
import useIsInView from '@/hooks/useIsInView'
import { usePageParam } from '@/hooks/usePageParam'

import { useSeriesContext } from './context'
import MediaGrid from './MediaGrid'

function SeriesOverviewScene() {
	const is3XLScreenOrBigger = useMediaMatch('(min-width: 1600px)')

	const [containerRef, isInView] = useIsInView<HTMLDivElement>()

	const { page, setPage } = usePageParam()
	const { series } = useSeriesContext()

	const { layoutMode } = useLayoutMode()
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
				id: series.id,
			},
		},
	})

	const { current_page, total_pages } = pageData || {}
	const isOnFirstPage = current_page === 1
	const hasStuff = total_pages !== undefined && current_page !== undefined

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

	const renderContent = () => {
		if (layoutMode === 'GRID') {
			return (
				<MediaGrid
					isLoading={isLoadingMedia}
					media={media}
					hasFilters={Object.keys(filters || {}).length > 0}
				/>
			)
		} else {
			return (
				<MediaList
					isLoading={isLoadingMedia}
					media={media}
					hasFilters={Object.keys(filters || {}).length > 0}
				/>
			)
		}
	}

	return (
		<>
			<Helmet>
				<title>Stump | {series.name || ''}</title>
			</Helmet>

			<section ref={containerRef} id="grid-top-indicator" className="h-1" />

			<FilterToolBar
				isRefetching={isRefetchingMedia}
				searchPlaceholder="Search media in series by name or description."
				entity="media"
				orderBy
			/>

			<div className="flex w-full flex-col gap-y-6">
				{hasStuff && (
					<Pagination pages={total_pages} currentPage={current_page} onChangePage={setPage} />
				)}
				<div className="px-4">{renderContent()}</div>
				{hasStuff && (
					<Pagination
						position="bottom"
						pages={total_pages}
						currentPage={current_page}
						onChangePage={setPage}
					/>
				)}
			</div>
		</>
	)
}

export default function SeriesOverviewSceneWrapper() {
	return (
		<FilterProvider>
			<SeriesOverviewScene />
		</FilterProvider>
	)
}
