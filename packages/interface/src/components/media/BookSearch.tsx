import { usePagedMediaQuery } from '@stump/client'
import { usePreviousIsDifferent } from '@stump/components'
import { Media } from '@stump/types'
import React, { useEffect } from 'react'

import useIsInView from '../../hooks/useIsInView'
import MediaGrid from '../../scenes/series/MediaGrid'
import { FilterToolBar, useFilterContext } from '../filters'
import Pagination from '../Pagination'

type Props = {
	page: number
	setPage: (page: number) => void
	onBookSelect?: (book: Media) => void
	showFilters?: boolean
}

/**
 *  A component that renders a paginated grid of books with a search bar and (optionally)
 *  a filter slide over. Must be used within a `FilterProvider`.
 */
export default function BookSearch({ page, setPage, onBookSelect, showFilters }: Props) {
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

	const differentSearch = usePreviousIsDifferent(filters?.search as string)
	useEffect(() => {
		if (differentSearch) {
			setPage(1)
		}
	}, [differentSearch, setPage])

	const [containerRef, isInView] = useIsInView<HTMLDivElement | null>()
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

	const hasStuff = total_pages !== undefined && current_page !== undefined && total_pages > 0
	const hasFilters = Object.keys(filters || {}).length > 0

	return (
		<>
			<section ref={containerRef} id="grid-top-indicator" className="h-1" />

			<FilterToolBar
				isRefetching={isRefetching}
				searchPlaceholder="Search books by name or description."
				slideOverForm={showFilters ? 'media' : null}
			/>

			<div className="flex w-full flex-col space-y-6 pt-4">
				{hasStuff && (
					<Pagination
						pages={total_pages}
						currentPage={current_page}
						onChangePage={(page) => setPage(page)}
					/>
				)}
				<MediaGrid
					isLoading={isLoading}
					media={media}
					hasFilters={hasFilters}
					onSelect={onBookSelect}
				/>
				{hasStuff && (
					<Pagination
						position="bottom"
						pages={total_pages}
						currentPage={current_page}
						onChangePage={(page) => setPage(page)}
					/>
				)}
			</div>
		</>
	)
}
