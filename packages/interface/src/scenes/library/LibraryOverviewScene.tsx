import { useLayoutMode, useLibrary, useLibrarySeries } from '@stump/client'
import { Suspense, useEffect } from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router'

import Pagination from '../../components/Pagination'
import SceneContainer from '../../components/SceneContainer'
import SeriesGrid from '../../components/series/SeriesGrid'
import SeriesList from '../../components/series/SeriesList'
import { useGetPage } from '../../hooks/useGetPage'
import useIsInView from '../../hooks/useIsInView'

export default function LibraryOverviewScene() {
	const { id } = useParams()
	const { page } = useGetPage()

	const [containerRef, isInView] = useIsInView<HTMLDivElement>()

	if (!id) {
		throw new Error('Library id is required')
	}

	const { layoutMode } = useLayoutMode('LIBRARY')
	const { isLoading, library } = useLibrary(id)

	const { isLoading: isLoadingSeries, series, pageData } = useLibrarySeries(id, page)

	useEffect(
		() => {
			if (!isInView) {
				containerRef.current?.scrollIntoView()
			}
		},

		// eslint-disable-next-line react-hooks/exhaustive-deps
		[pageData?.current_page],
	)

	if (isLoading) {
		return null
	} else if (!library) {
		throw new Error('Library not found')
	}

	const { current_page, total_pages } = pageData || {}
	const hasStuff = total_pages !== undefined && current_page !== undefined

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {library.name}</title>
			</Helmet>

			{/* @ts-expect-error: wrong ref, still okay */}
			<section ref={containerRef} id="grid-top-indicator" className="h-0" />

			<div className="flex h-full w-full flex-col space-y-6 p-4">
				{hasStuff ? <Pagination pages={total_pages} currentPage={current_page} /> : null}
				{layoutMode === 'GRID' ? (
					<SeriesGrid isLoading={isLoadingSeries} series={series} />
				) : (
					<SeriesList isLoading={isLoadingSeries} series={series} />
				)}
				{hasStuff ? (
					<Pagination position="bottom" pages={total_pages} currentPage={current_page} />
				) : null}
			</div>
		</SceneContainer>
	)
}
