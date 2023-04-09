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
import LibraryOverviewTitleSection from './LibraryOverviewTitleSection'

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

	const { current_page, total_pages } = pageData || {}
	const isOnFirstPage = current_page === 1
	const hasStuff = total_pages !== undefined && current_page !== undefined

	useEffect(
		() => {
			if (!isInView && !isOnFirstPage) {
				containerRef.current?.scrollIntoView()
			}
		},

		// eslint-disable-next-line react-hooks/exhaustive-deps
		[pageData?.current_page, isOnFirstPage],
	)

	if (isLoading) {
		return null
	} else if (!library) {
		throw new Error('Library not found')
	}

	const renderContent = () => {
		if (layoutMode === 'GRID') {
			return <SeriesGrid isLoading={isLoadingSeries} series={series} />
		} else {
			return <SeriesList isLoading={isLoadingSeries} series={series} />
		}
	}

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {library.name}</title>
			</Helmet>

			<LibraryOverviewTitleSection library={library} isVisible={current_page === 1} />

			{/* @ts-expect-error: wrong ref, still okay */}
			<section ref={containerRef} id="grid-top-indicator" className="h-0" />

			<div className="flex w-full flex-col space-y-6 p-4">
				{hasStuff && <Pagination pages={total_pages} currentPage={current_page} />}
				{renderContent()}
				{hasStuff && (
					<Pagination position="bottom" pages={total_pages} currentPage={current_page} />
				)}
			</div>
		</SceneContainer>
	)
}
