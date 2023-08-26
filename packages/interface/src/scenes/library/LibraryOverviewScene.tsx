import { useLayoutMode, useLibraryByIdQuery, useLibrarySeriesQuery } from '@stump/client'
import { usePreviousIsDifferent } from '@stump/components'
import { useEffect } from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router'

import { useFilterContext } from '../../components/filters/context_new'
import FilterProvider from '../../components/filters/FilterProvider'
import Search from '../../components/filters/Search'
import Pagination from '../../components/Pagination'
import SceneContainer from '../../components/SceneContainer'
import SeriesGrid from '../../components/series/SeriesGrid'
import SeriesList from '../../components/series/SeriesList'
import useIsInView from '../../hooks/useIsInView'
import { usePageParam } from '../../hooks/usePageParam'
import LibraryOverviewTitleSection from './LibraryOverviewTitleSection'

function LibraryOverviewScene() {
	const { id } = useParams()
	const { page, setPage } = usePageParam()

	const [containerRef, isInView] = useIsInView<HTMLDivElement>()

	if (!id) {
		throw new Error('Library id is required')
	}

	const { layoutMode } = useLayoutMode('LIBRARY')
	const { isLoading, library } = useLibraryByIdQuery(id)

	// TODO: a little bit complicated of a situation, but whenever filters change but the page doesn't
	// we MIGHT need to change to page to 1. This is because the filters might have changed the total,
	// and we might be on a page that doesn't exist anymore.
	const { filters, setFilter, removeFilter } = useFilterContext()
	const {
		isLoading: isLoadingSeries,
		isRefetching: isRefetchingSeries,
		series,
		pageData,
	} = useLibrarySeriesQuery(id, { page, params: filters })

	const differentSearch = usePreviousIsDifferent(filters?.search as string)
	useEffect(() => {
		if (differentSearch) {
			setPage(1)
		}
	}, [differentSearch, setPage])

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
			<section ref={containerRef} id="grid-top-indicator" className="h-1" />

			<header className="flex h-12 flex-col gap-2 px-4">
				<Search
					initialValue={filters?.search as string}
					placeholder="Search series by name or description"
					onChange={(value) => {
						if (value) {
							setFilter('search', value)
						} else {
							removeFilter('search')
						}
					}}
					isLoading={isRefetchingSeries}
				/>
			</header>

			<div className="flex w-full flex-col space-y-6 p-4">
				{hasStuff && (
					<Pagination
						pages={total_pages}
						currentPage={current_page}
						onChangePage={(page) => setPage(page)}
					/>
				)}
				{renderContent()}
				{hasStuff && (
					<Pagination
						position="bottom"
						pages={total_pages}
						currentPage={current_page}
						onChangePage={(page) => setPage(page)}
					/>
				)}
			</div>
		</SceneContainer>
	)
}

export default function LibraryOverviewSceneWrapper() {
	return (
		<FilterProvider>
			<LibraryOverviewScene />
		</FilterProvider>
	)
}
