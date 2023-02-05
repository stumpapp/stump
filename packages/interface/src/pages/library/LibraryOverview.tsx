import { Spacer } from '@chakra-ui/react'
import { useLayoutMode, useLibrary, useLibrarySeries } from '@stump/client'
import { useEffect } from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router-dom'

import SeriesGrid from '../../components/series/SeriesGrid'
import SeriesList from '../../components/series/SeriesList'
import { useGetPage } from '../../hooks/useGetPage'
import useIsInView from '../../hooks/useIsInView'
import Pagination from '../../ui/Pagination'

export default function LibraryOverview() {
	const [containerRef, isInView] = useIsInView<HTMLDivElement>()

	const { id } = useParams()
	const { page } = useGetPage()

	if (!id) {
		throw new Error('Library id is required')
	}

	function handleError(err: unknown) {
		console.error(err)
	}

	const { layoutMode } = useLayoutMode('LIBRARY')
	const { isLoading, library } = useLibrary(id, { onError: handleError })

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
		<>
			<Helmet>
				<title>Stump | {library.name}</title>
			</Helmet>

			{/* @ts-expect-error: wrong ref, still okay */}
			<section ref={containerRef} id="grid-top-indicator" className="h-0" />

			<div className="p-4 w-full h-full flex flex-col space-y-6">
				{hasStuff ? <Pagination pages={total_pages} currentPage={current_page} /> : null}

				{layoutMode === 'GRID' ? (
					<SeriesGrid isLoading={isLoadingSeries} series={series} />
				) : (
					<SeriesList isLoading={isLoadingSeries} series={series} />
				)}

				<Spacer />

				{hasStuff ? (
					<Pagination position="bottom" pages={total_pages} currentPage={current_page} />
				) : null}
			</div>
		</>
	)
}
