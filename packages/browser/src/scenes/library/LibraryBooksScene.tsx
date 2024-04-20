import { prefetchPagedMedia, usePagedMediaQuery } from '@stump/client'
import { useCallback, useEffect, useMemo } from 'react'
import { Helmet } from 'react-helmet'
import { useMediaMatch } from 'rooks'

import { FilterProvider, FilterToolBar, useFilterContext } from '@/components/filters'
import MediaList from '@/components/media/MediaList'
import Pagination from '@/components/Pagination'
import { useLayoutMode } from '@/hooks'
import useIsInView from '@/hooks/useIsInView'
import { usePageParam } from '@/hooks/usePageParam'

import MediaGrid from '../series/MediaGrid'
import { useLibraryContext } from './context'

export default function LibraryBooksSceneContainer() {
	return (
		<FilterProvider>
			<LibraryBooksScene />
		</FilterProvider>
	)
}

function LibraryBooksScene() {
	const is3XLScreenOrBigger = useMediaMatch('(min-width: 1600px)')

	const [containerRef, isInView] = useIsInView<HTMLDivElement>()

	const { page, setPage } = usePageParam()
	const { library } = useLibraryContext()

	const { layoutMode } = useLayoutMode()
	const { filters } = useFilterContext()

	const params = useMemo(
		() => ({
			page,
			page_size: is3XLScreenOrBigger ? 40 : 20,
			params: {
				...filters,
				series: {
					library: {
						id: library.id,
					},
				},
			},
		}),
		[page, is3XLScreenOrBigger, filters, library.id],
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
				<title>Stump | {library.name || ''}</title>
			</Helmet>

			<section ref={containerRef} id="grid-top-indicator" className="h-1" />

			{/* FIXME: This component is currently intertwined with series context, and so it needs to change before I enable it */}
			<FilterToolBar
				isRefetching={isRefetchingMedia}
				searchPlaceholder="Search media by name or description."
				entity="media"
				orderBy
				isDisabled
			/>

			<div className="flex w-full flex-col gap-y-6">
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
			</div>
		</>
	)
}
