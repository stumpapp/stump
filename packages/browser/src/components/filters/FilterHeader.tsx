import { cn, useSticky } from '@stump/components'
import { useCallback } from 'react'
import { useMediaMatch } from 'rooks'

import { usePreferences } from '@/hooks/usePreferences'

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
	/**
	 * The controls for adjusting the size of cards/items
	 */
	sizeControls?: React.ReactNode
	navOffset?: boolean
}

// TODO: transparent until sticky hits, then bg-background
export default function FilterHeader({
	isSearching,
	isSearchDisabled,
	searchPlaceholder,
	layoutControls,
	orderControls,
	filterControls,
	sizeControls,
	navOffset,
}: Props) {
	const isMobile = useMediaMatch('(max-width: 768px)')
	const {
		preferences: { primaryNavigationMode },
	} = usePreferences()
	const { ref, isSticky } = useSticky<HTMLDivElement>({
		extraOffset: isMobile || primaryNavigationMode === 'TOPBAR' ? 56 : 0,
	})

	const { search, setSearch, removeSearch } = useFilterContext()
	const onSearchChange = useCallback(
		(value: string) => {
			if (value === search) return
			// Note: This prevents unnecessary state updates which causes unneeded location state
			// changes which causes an IRRITATING bug where you have to back out of the page like
			// 4-6 times to actually go back when using the browser back button lol
			if (!value && !search) return
			if (value) {
				setSearch(value)
			} else {
				removeSearch()
			}
		},
		[setSearch, removeSearch, search],
	)

	return (
		<header
			ref={ref}
			className={cn(
				'sticky z-10 flex h-12 w-full shrink-0 justify-between gap-2 border-b border-edge px-4 md:top-0',
				{
					'bg-background': isSticky || !isMobile,
				},
				navOffset ? 'top-12' : 'top-0',
			)}
		>
			<Search
				initialValue={search || ''}
				placeholder={searchPlaceholder}
				onChange={onSearchChange}
				isLoading={isSearching}
				isDisabled={isSearchDisabled}
			/>

			<div className="flex items-center gap-4">
				{sizeControls}

				<div className="flex items-center gap-x-2">
					{orderControls}
					{filterControls}
				</div>
				{layoutControls}
			</div>
		</header>
	)
}
