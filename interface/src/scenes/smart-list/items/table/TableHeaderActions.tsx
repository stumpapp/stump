import React, { useState } from 'react'

import { Search } from '@/components/filters'

import FilterBottomDrawer from './FilterBottomDrawer'
import PersistedViewSelector from './PersistedViewSelector'

export default function TableHeaderActions() {
	const [filter, setFilter] = useState<string>()

	// TODO: when sticks adjust height/padding?
	return (
		<header className="sticky top-0 flex h-12 w-full items-center gap-x-2 bg-background px-4">
			<PersistedViewSelector />
			<FilterBottomDrawer />
			<Search onChange={setFilter} placeholder="Quick filter" />
		</header>
	)
}
