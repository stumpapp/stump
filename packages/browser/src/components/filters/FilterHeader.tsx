import React from 'react'

import { useFilterContext } from './context'
import Search from './Search'

type Props = {
	orderControls?: React.ReactNode
	filterControls?: React.ReactNode
	layoutControls?: React.ReactNode
}

export default function FilterHeader({ layoutControls, orderControls, filterControls }: Props) {
	const { filters, setFilter, removeFilter } = useFilterContext()

	return (
		<header className="sticky top-0 z-10 flex h-12 w-full shrink-0 justify-between gap-2 border-b border-edge bg-background px-4">
			<Search
				initialValue={filters?.search as string}
				// placeholder={searchPlaceholder}
				onChange={(value) => {
					if (value) {
						setFilter('search', value)
					} else {
						removeFilter('search')
					}
				}}
				// isLoading={isRefetching}
				// isDisabled={isDisabled}
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
