import { Badge, Button, cn, Text, useSticky } from '@stump/components'
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
			<div className="flex flex-1 items-center space-x-2">
				<Badge
					variant="primary"
					size="sm"
					className="flex cursor-pointer items-center justify-between space-x-1 pl-2 pr-1 opacity-95 hover:opacity-100"
				>
					<span>Smart filters</span>
					<span className="flex h-5 w-5 items-center justify-center rounded-md bg-fill-brand-secondary">
						5
					</span>
				</Badge>

				<Badge
					variant="primary"
					size="sm"
					className="flex cursor-pointer items-center justify-between space-x-1 pl-2 pr-1 opacity-95 hover:opacity-100"
				>
					<span>Order params</span>
					<span className="flex h-5 w-5 items-center justify-center rounded-md bg-fill-brand-secondary">
						2
					</span>
				</Badge>

				<Text variant="muted" size="sm" className="pl-2">
					500 results
				</Text>
			</div>

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
