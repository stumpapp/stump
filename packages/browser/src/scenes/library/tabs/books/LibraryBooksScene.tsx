import { prefetchPagedMedia, usePagedMediaQuery } from '@stump/client'
import { usePreviousIsDifferent } from '@stump/components'
import { useCallback, useEffect, useMemo } from 'react'
import { Helmet } from 'react-helmet'

import {
	BookExplorationLayout,
	BookTable,
	BookTableColumnConfiguration,
	BookURLFilterDrawer,
	BookURLOrdering,
} from '@/components/book'
import BookGrid from '@/components/book/BookGrid'
import {
	FilterContext,
	FilterHeader,
	URLFilterContainer,
	useFilterScene,
} from '@/components/filters'
import useIsInView from '@/hooks/useIsInView'
import { useBooksLayout } from '@/stores/layout'

import { useLibraryContext } from '../../context'

export default function LibraryBooksScene() {
	const [containerRef, isInView] = useIsInView<HTMLDivElement>()

	const { library } = useLibraryContext()
	const { layoutMode } = useBooksLayout((state) => ({ layoutMode: state.layout }))
	const {
		filters,
		ordering,
		pagination: { page, page_size },
		setPage,
		...rest
	} = useFilterScene()
	const params = useMemo(
		() => ({
			page,
			page_size,
			params: {
				...filters,
				...ordering,
				series: {
					library: {
						id: library.id,
					},
				},
			},
		}),
		[page, page_size, ordering, filters, library.id],
	)
	const {
		isLoading: isLoadingMedia,
		// isRefetching: isRefetchingMedia,
		media,
		pageData,
	} = usePagedMediaQuery(params)
	const { current_page, total_pages } = pageData || {}

	const differentSearch = usePreviousIsDifferent(filters?.search as string)
	useEffect(() => {
		if (differentSearch) {
			setPage(1)
		}
	}, [differentSearch, setPage])

	const handlePrefetchPage = useCallback(
		(page: number) => {
			prefetchPagedMedia({
				...params,
				page,
			})
		},
		[params],
	)

	const shouldScroll = usePreviousIsDifferent(current_page)
	useEffect(
		() => {
			if (!isInView && shouldScroll) {
				containerRef.current?.scrollIntoView({
					behavior: 'smooth',
					block: 'nearest',
					inline: 'start',
				})
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[shouldScroll],
	)

	const renderContent = () => {
		if (layoutMode === 'GRID') {
			return (
				<URLFilterContainer
					currentPage={current_page || 1}
					pages={total_pages || 1}
					onChangePage={setPage}
					onPrefetchPage={handlePrefetchPage}
				>
					<div className="flex flex-1 px-4 pb-2 pt-4 md:pb-4">
						<BookGrid
							isLoading={isLoadingMedia}
							books={media}
							hasFilters={Object.keys(filters || {}).length > 0}
						/>
					</div>
				</URLFilterContainer>
			)
		} else {
			return (
				<BookTable
					books={media || []}
					render={(props) => (
						<URLFilterContainer
							currentPage={current_page || 1}
							pages={total_pages || 1}
							onChangePage={setPage}
							onPrefetchPage={handlePrefetchPage}
							tableControls={<BookTableColumnConfiguration />}
							{...props}
						/>
					)}
				/>
			)
		}
	}

	return (
		<FilterContext.Provider
			value={{
				filters,
				ordering,
				pagination: { page, page_size },
				setPage,
				...rest,
			}}
		>
			<div className="flex flex-1 flex-col pb-4 md:pb-0">
				<Helmet>
					<title>Stump | {library.name || ''}</title>
				</Helmet>

				<section ref={containerRef} id="grid-top-indicator" className="h-1" />

				<FilterHeader
					layoutControls={<BookExplorationLayout />}
					orderControls={<BookURLOrdering />}
					filterControls={<BookURLFilterDrawer />}
				/>

				{renderContent()}
			</div>
		</FilterContext.Provider>
	)
}
