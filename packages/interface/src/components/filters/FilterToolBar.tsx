import React from 'react'

import { useFilterContext } from './context'
import FilterDisplay from './FilterDisplay'
import FilterSlideOver from './FilterSlideOver'
import Search from './Search'

type Props = {
	searchPlaceholder?: string
	filterSlideOverPrompt?: string
	isRefetching?: boolean
}

export default function FilterToolBar({
	searchPlaceholder,
	filterSlideOverPrompt,
	isRefetching,
}: Props) {
	const { filters, setFilter, removeFilter } = useFilterContext()
	return (
		<header className="flex flex-col gap-2 px-4">
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
				<FilterSlideOver prompt={filterSlideOverPrompt} />
			</div>
			<FilterDisplay />
		</header>
	)
}
