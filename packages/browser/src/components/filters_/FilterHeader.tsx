import { cn, useSticky } from '@stump/components'
import React from 'react'
import { useMediaMatch } from 'rooks'

import SmartSearchButton from './SmartSearchButton'

type Props = {
	navOffset?: boolean
}

export default function FilterHeader({ navOffset }: Props) {
	const isMobile = useMediaMatch('(max-width: 768px)')
	const { ref, isSticky } = useSticky({ extraOffset: isMobile ? 56 : 0 })

	return (
		<header
			ref={ref}
			className={cn(
				'sticky z-10 flex h-12 w-full shrink-0 justify-between gap-2 border-b border-edge px-4 md:top-0',
				{
					'bg-background': isSticky,
				},
				navOffset ? 'top-12' : 'top-0',
			)}
		>
			{/* <Search
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
			/> */}
			<div className="flex-1" />

			<div className="flex items-center gap-4">
				<div className="flex items-center gap-x-1">
					<SmartSearchButton />

					{/* {orderControls} */}
					{/* {filterControls} */}
				</div>
				{/* {layoutControls} */}
			</div>
		</header>
	)
}
