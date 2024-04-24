import React from 'react'

import { useFilterContext } from './context'
import Search from './Search'

type Props = {
	/**
	 * Whether the search is being fetched from the server
	 */
	isSearching?: boolean
	/**
	 * Whether the search input should be disabled
	 */
	isSearchDisabled?: boolean
	/**
	 * Placeholder for the search input
	 */
	searchPlaceholder?: string
	/**
	 * The controls for adjusting the order of the items
	 */
	orderControls?: React.ReactNode
	/**
	 * The controls for adjusting the filters
	 */
	filterControls?: React.ReactNode
	/**
	 * The controls for adjusting the layout, i.e. GRID or TABLE
	 */
	layoutControls?: React.ReactNode
}

export default function FilterHeader({
	isSearching,
	isSearchDisabled,
	searchPlaceholder,
	layoutControls,
	orderControls,
	filterControls,
}: Props) {
	const { filters, setFilter, removeFilter } = useFilterContext()

	return (
		<header className="sticky top-12 z-10 flex h-12 w-full shrink-0 justify-between gap-2 border-b border-edge bg-background px-4 md:top-0">
			<Search
				initialValue={filters?.search as string}
				placeholder={searchPlaceholder}
				onChange={(value) => {
					if (value) {
						setFilter('search', value)
					} else {
						removeFilter('search')
					}
				}}
				isLoading={isSearching}
				isDisabled={isSearchDisabled}
			/>

			<div className="flex items-center gap-4">
				<div className="flex items-center gap-x-2">
					{orderControls}
					{filterControls}
				</div>
				{layoutControls}
			</div>
		</header>
	)
}
