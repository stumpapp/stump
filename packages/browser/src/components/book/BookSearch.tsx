import { usePreviousIsDifferent } from '@stump/components'
import { Media } from '@stump/sdk'
import { useCallback, useEffect, useMemo } from 'react'

import useIsInView from '@/hooks/useIsInView'

import { FilterToolBar, useFilterContext } from '../filters'
import Pagination from '../Pagination'

type Props = {
	page: number
	page_size?: number
	setPage: (page: number) => void
	onBookSelect?: (book: Media) => void
	showFilters?: boolean
}

// TODO(bookclub): Refactor this component

/**
 *  A component that renders a paginated grid of books with a search bar and (optionally)
 *  a filter slide over. Must be used within a `FilterProvider`.
 */
export default function BookSearch({ page, page_size, setPage, onBookSelect, showFilters }: Props) {
	// TODO(graphql): Fixme
	return null
	// const { filters } = useFilterContext()

	// const params = useMemo(
	// 	() => ({
	// 		page,
	// 		page_size,
	// 		params: filters,
	// 	}),
	// 	[page, page_size, filters],
	// )
	// const {
	// 	isLoading,
	// 	isRefetching,
	// 	media,
	// 	pageData: { current_page, total_pages } = {},
	// } = usePagedMediaQuery(params)
	// const { prefetch } = usePrefetchMediaPaged()

	// const differentSearch = usePreviousIsDifferent(filters?.search as string)
	// useEffect(() => {
	// 	if (differentSearch) {
	// 		setPage(1)
	// 	}
	// }, [differentSearch, setPage])

	// const [containerRef, isInView] = useIsInView<HTMLDivElement | null>()
	// const isOnFirstPage = current_page === 1
	// // TODO: detect if going from page > 1 to page = 1 and scroll to top
	// useEffect(() => {
	// 	if (!isInView && !isOnFirstPage) {
	// 		containerRef.current?.scrollIntoView()
	// 	}
	// }, [current_page, isOnFirstPage])

	// const hasStuff = total_pages !== undefined && current_page !== undefined && total_pages > 0
	// const hasFilters = Object.keys(filters || {}).length > 0

	// const handlePrefetchPage = useCallback(
	// 	(page: number) => {
	// 		prefetch({
	// 			...params,
	// 			page,
	// 		})
	// 	},
	// 	[prefetch, params],
	// )

	// return (
	// 	<>
	// 		<section ref={containerRef} id="grid-top-indicator" className="h-0" />

	// 		<FilterToolBar
	// 			isRefetching={isRefetching}
	// 			searchPlaceholder="Search books by name or description."
	// 			{...(showFilters ? { entity: 'media', orderBy: true } : {})}
	// 		/>

	// 		<div className="flex w-full flex-col space-y-6 pb-[64px] pt-4 md:pb-0">
	// 			{hasStuff && (
	// 				<Pagination
	// 					pages={total_pages}
	// 					currentPage={current_page}
	// 					onChangePage={(page) => setPage(page)}
	// 					onPrefetchPage={handlePrefetchPage}
	// 				/>
	// 			)}
	// 			<BookGrid
	// 				isLoading={isLoading}
	// 				books={media}
	// 				hasFilters={hasFilters}
	// 				onSelect={onBookSelect}
	// 			/>
	// 			{hasStuff && (
	// 				<Pagination
	// 					position="bottom"
	// 					pages={total_pages}
	// 					currentPage={current_page}
	// 					onChangePage={(page) => setPage(page)}
	// 					onPrefetchPage={handlePrefetchPage}
	// 				/>
	// 			)}
	// 		</div>
	// 	</>
	// )
}
