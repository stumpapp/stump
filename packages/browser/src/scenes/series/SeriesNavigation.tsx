import { prefetchFiles, usePreferences } from '@stump/client'
import { cn, Link } from '@stump/components'
import React, { useMemo } from 'react'
import { useLocation } from 'react-router'

import { useAppContext } from '@/context'

import { useSeriesContext } from './context'

export default function SeriesNavigation() {
	const location = useLocation()
	const {
		preferences: { primary_navigation_mode, layout_max_width_px },
	} = usePreferences()
	const {
		series: { path },
	} = useSeriesContext()
	const { checkPermission } = useAppContext()

	const canAccessFiles = checkPermission('file:explorer')
	const tabs = useMemo(
		() => [
			{
				isActive: location.pathname.match(/\/series\/[^/]+\/books(\/.*)?$/),
				label: 'Books',
				to: 'books',
			},
			...(canAccessFiles
				? [
						{
							disabled: true,
							isActive: location.pathname.match(/\/series\/[^/]+\/files(\/.*)?$/),
							label: 'Files',
							onHover: () => prefetchFiles(path),
							to: 'files',
						},
					]
				: []),
			{
				isActive: location.pathname.match(/\/series\/[^/]+\/settings(\/.*)?$/),
				label: 'Settings',
				to: 'settings',
			},
		],
		[location, path, canAccessFiles],
	)

	const preferTopBar = primary_navigation_mode === 'TOPBAR'

	return (
		<div className="sticky top-0 z-10 w-full border-b border-gray-75 bg-white md:relative md:top-[unset] md:z-[unset] dark:border-gray-850 dark:bg-gray-975">
			<nav
				className={cn(
					'-mb-px flex gap-x-6 overflow-x-scroll px-3 scrollbar-hide md:overflow-x-hidden',
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
						onMouseEnter={tab.onHover}
						className={cn(
							'whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium',
							{
								'border-brand-500 text-brand-600 dark:text-brand-400': tab.isActive,
								'border-transparent text-gray-800 hover:border-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-gray-200':
									!tab.isActive,
							},
							{
								'pointer-events-none !text-opacity-40': tab.disabled,
							},
						)}
					>
						{tab.label}
					</Link>
				))}
			</nav>
		</div>
	)
}
