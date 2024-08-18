import { prefetchFiles, prefetchSeriesMedia } from '@stump/client'
import { cn, Link } from '@stump/components'
import React, { useMemo } from 'react'
import { useLocation } from 'react-router'

import { useAppContext } from '@/context'
import { usePreferences } from '@/hooks'

import { useSeriesContext } from './context'

export default function SeriesNavigation() {
	const location = useLocation()
	const {
		preferences: { primary_navigation_mode, layout_max_width_px },
	} = usePreferences()
	const {
		series: { id, path },
	} = useSeriesContext()
	const { checkPermission } = useAppContext()

	const canAccessFiles = checkPermission('file:explorer')
	const tabs = useMemo(
		() => [
			{
				isActive: location.pathname.match(/\/series\/[^/]+\/books(\/.*)?$/),
				label: 'Books',
				onHover: () => prefetchSeriesMedia(id),
				to: 'books',
			},
			...(canAccessFiles
				? [
						{
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
		[location, id, path, canAccessFiles],
	)

	const preferTopBar = primary_navigation_mode === 'TOPBAR'

	return (
		<div className="sticky top-0 z-10 h-12 w-full border-b border-edge bg-background md:relative md:top-[unset] md:z-[unset]">
			<nav
				className={cn(
					'-mb-px flex h-12 gap-x-6 overflow-x-scroll px-3 scrollbar-hide md:overflow-x-hidden',
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
								'border-brand-500 text-brand-500': tab.isActive,
								'border-transparent text-foreground-muted hover:border-edge': !tab.isActive,
							},
							// {
							// 	'pointer-events-none !text-opacity-40': tab.disabled,
							// },
						)}
					>
						{tab.label}
					</Link>
				))}
			</nav>
		</div>
	)
}
