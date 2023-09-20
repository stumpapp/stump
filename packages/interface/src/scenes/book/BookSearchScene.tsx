import { usePagedMediaQuery } from '@stump/client'
import { usePreviousIsDifferent } from '@stump/components'
import React, { useEffect } from 'react'
import { Helmet } from 'react-helmet'

import { FilterProvider, FilterToolBar, useFilterContext } from '../../components/filters'
import Pagination from '../../components/Pagination'
import SceneContainer from '../../components/SceneContainer'
import useIsInView from '../../hooks/useIsInView'
import { usePageParam } from '../../hooks/usePageParam'
import MediaGrid from '../series/MediaGrid'

function BookSearchScene() {
	const { page, setPage } = usePageParam()
	const { filters } = useFilterContext()
	const {
		isLoading,
		isRefetching,
		media,
		pageData: { current_page, total_pages } = {},
	} = usePagedMediaQuery({
		page,
		params: filters,
	})

	const isOnFirstPage = current_page === 1
	// TODO: detect if going from page > 1 to page = 1 and scroll to top
	useEffect(
		() => {
			if (!isInView && !isOnFirstPage) {
				containerRef.current?.scrollIntoView()
			}
		},

		// eslint-disable-next-line react-hooks/exhaustive-deps
		[current_page, isOnFirstPage],
	)

	const [containerRef, isInView] = useIsInView<HTMLDivElement>()

	const differentSearch = usePreviousIsDifferent(filters?.search as string)
	useEffect(() => {
		if (differentSearch) {
			setPage(1)
		}
	}, [differentSearch, setPage])

	const hasStuff = total_pages !== undefined && current_page !== undefined && total_pages > 0
	const hasFilters = Object.keys(filters || {}).length > 0

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | Books</title>
			</Helmet>

			{/* @ts-expect-error: wrong ref, still okay */}
			<section ref={containerRef} id="grid-top-indicator" className="h-1" />

			<FilterToolBar
				isRefetching={isRefetching}
				searchPlaceholder="Search books by name or description."
				slideOverForm="media"
			/>

			<div className="flex w-full flex-col space-y-6 p-4">
				{hasStuff && (
					<Pagination
						pages={total_pages}
						currentPage={current_page}
						onChangePage={(page) => setPage(page)}
					/>
				)}
				<MediaGrid isLoading={isLoading} media={media} hasFilters={hasFilters} />
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

export default function BookSearchSceneWrapper() {
	return (
		<FilterProvider>
			<BookSearchScene />
		</FilterProvider>
	)
}
