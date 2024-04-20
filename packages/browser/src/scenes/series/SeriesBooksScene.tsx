import { prefetchPagedMedia, usePagedMediaQuery } from '@stump/client'
import { cn } from '@stump/components'
import { useCallback, useEffect, useMemo } from 'react'
import { Helmet } from 'react-helmet'
import { useMediaMatch } from 'rooks'

import {
	BookExplorationLayout,
	BookTable,
	BookTableURLFilterContainer,
	BookURLFilterDrawer,
	BookURLOrdering,
} from '@/components/book'
import { SceneContainer } from '@/components/container'
import { FilterHeader, FilterProvider, FilterToolBar, useFilterContext } from '@/components/filters'
import MediaList from '@/components/media/MediaList'
import Pagination from '@/components/Pagination'
import { useLayoutMode, usePageParam } from '@/hooks'
import useIsInView from '@/hooks/useIsInView'
import { useBooksLayout } from '@/stores/layout'

import { useSeriesContext } from './context'
import MediaGrid from './MediaGrid'

function SeriesOverviewScene() {
	const is3XLScreenOrBigger = useMediaMatch('(min-width: 1600px)')

	const [containerRef, isInView] = useIsInView<HTMLDivElement>()

	const { page, setPage } = usePageParam()
	const { series } = useSeriesContext()

	const { layoutMode } = useBooksLayout((state) => ({ layoutMode: state.layout }))
	const { filters } = useFilterContext()

	const params = useMemo(
		() => ({
			page,
			page_size: is3XLScreenOrBigger ? 40 : 20,
			params: {
				...filters,
				series: {
					id: series.id,
				},
			},
		}),
		[page, is3XLScreenOrBigger, filters, series.id],
	)
	const {
		isLoading: isLoadingMedia,
		isRefetching: isRefetchingMedia,
		media,
		pageData,
	} = usePagedMediaQuery(params)

	const { current_page, total_pages } = pageData || {}

	const isOnFirstPage = current_page === 1
	const hasStuff = total_pages !== undefined && current_page !== undefined

	const handlePrefetchPage = useCallback(
		(page: number) => {
			prefetchPagedMedia({
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
				<BookTableURLFilterContainer
					currentPage={current_page || 1}
					pages={total_pages || 1}
					onChangePage={setPage}
					onPrefetchPage={handlePrefetchPage}
				>
					<div className="p-4">
						<MediaGrid
							isLoading={isLoadingMedia}
							media={media}
							hasFilters={Object.keys(filters || {}).length > 0}
						/>
					</div>
				</BookTableURLFilterContainer>
			)
		} else {
			return (
				<BookTable
					books={media || []}
					render={(props) => (
						<BookTableURLFilterContainer
							currentPage={current_page || 1}
							pages={total_pages || 1}
							onChangePage={setPage}
							onPrefetchPage={handlePrefetchPage}
							{...props}
						/>
					)}
				/>
			)
		}
	}

	return (
		<>
			<Helmet>
				<title>Stump | {series.name || ''}</title>
			</Helmet>

			<section ref={containerRef} id="grid-top-indicator" className="hidden h-1" />

			<FilterHeader
				layoutControls={<BookExplorationLayout />}
				orderControls={<BookURLOrdering />}
				filterControls={<BookURLFilterDrawer />}
			/>

			{renderContent()}
			{/* <FilterToolBar
				isRefetching={isRefetchingMedia}
				searchPlaceholder="Search media in series by name or description."
				entity="media"
				orderBy
			/>

			<div className="flex w-full flex-col gap-y-6 pb-[64px] md:pb-0">
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
			</div> */}
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
