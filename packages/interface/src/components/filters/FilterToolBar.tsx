import React from 'react'

import { useFilterContext } from './context'
import FilterDisplay from './FilterDisplay'
import FilterSlideOver from './FilterSlideOver'
import { FilterFormVariant } from './form'
import Search from './Search'

type Props = {
	slideOverForm: FilterFormVariant
	/**
	 * The placeholder text to display in the search input.
	 */
	searchPlaceholder?: string
	/**
	 * The prompt to display in the filter slide over. This is effectively the
	 * subtitle of the slide over.
	 */
	filterSlideOverPrompt?: string
	/**
	 * Whether or not queries in the parent component are currently refetching. This
	 * displays a loading indicator in the search input if true.
	 */
	isRefetching?: boolean
}

/**
 * A component that renders a set of filter-related components within a header.
 */
export default function FilterToolBar({
	searchPlaceholder,
	filterSlideOverPrompt,
	isRefetching,
	slideOverForm,
}: Props) {
	const { filters, setFilter, removeFilter } = useFilterContext()
	return (
		<header className="flex flex-col gap-2">
			<div className="flex items-center justify-between gap-2">
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
					isLoading={isRefetching}
				/>
				<FilterSlideOver prompt={filterSlideOverPrompt} formVariant={slideOverForm} />
			</div>
			<FilterDisplay />
		</header>
	)
}
