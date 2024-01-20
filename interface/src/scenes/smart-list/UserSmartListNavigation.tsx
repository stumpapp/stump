import { prefetchSmartListItems, usePreferences } from '@stump/client'
import { cn, Link } from '@stump/components'
import React, { useMemo } from 'react'
import { useLocation } from 'react-router'

import { useSmartListContext } from './context'

export default function UserSmartListNavigation() {
	const location = useLocation()
	const {
		preferences: { primary_navigation_mode, layout_max_width_px },
	} = usePreferences()
	const {
		list: { id },
	} = useSmartListContext()

	const tabs = useMemo(
		() => [
			{
				// smart-lists/ID OR smart-lists/ID/items
				isActive: location.pathname.match(/\/smart-lists\/[^/]+(\/items)?$/),
				label: 'Items',
				onHover: () => prefetchSmartListItems(id),
				to: 'items',
			},
			{
				isActive: location.pathname.match(/\/smart-lists\/[^/]+\/settings(\/.*)?$/),
				label: 'Settings',
				to: 'settings',
			},
		],
		[location, id],
	)

	const preferTopBar = primary_navigation_mode === 'TOPBAR'

	return (
		<div className="relative z-10 w-full border-b border-edge-200 bg-background">
			<nav
				className={cn(
					'-mb-px flex gap-x-4 overflow-x-scroll px-3 transition-colors duration-150 scrollbar-hide md:overflow-x-hidden',
					{
						'mx-auto': preferTopBar && !!layout_max_width_px,
					},
				)}
				style={{ maxWidth: preferTopBar ? layout_max_width_px || undefined : undefined }}
			>
				{tabs.map((tab) => (
					<Link
						to={tab.to}
						key={tab.to}
						underline={false}
						className={cn('whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium', {
							'border-brand-500 text-brand-600 dark:text-brand-400': tab.isActive,
							'border-transparent text-gray-800 hover:border-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-gray-200':
								!tab.isActive,
						})}
						onMouseEnter={tab.onHover}
					>
						{tab.label}
					</Link>
				))}
			</nav>
		</div>
	)
}
