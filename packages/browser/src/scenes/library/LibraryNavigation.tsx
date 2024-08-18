import { prefetchLibraryFiles, prefetchLibraryMedia, prefetchLibrarySeries } from '@stump/client'
import { cn, Link } from '@stump/components'
import React, { useMemo } from 'react'
import { useLocation } from 'react-router'

import { useAppContext } from '@/context'
import { usePreferences } from '@/hooks'

import { useLibraryContext } from './context'

export default function LibraryNavigation() {
	const location = useLocation()
	const {
		preferences: { primary_navigation_mode, layout_max_width_px },
	} = usePreferences()
	const {
		library: { id, path },
	} = useLibraryContext()
	const { checkPermission } = useAppContext()

	const canAccessFiles = checkPermission('file:explorer')
	const tabs = useMemo(
		() => [
			{
				isActive: location.pathname.match(/\/libraries\/[^/]+\/?(series)?$/),
				label: 'Series',
				onHover: () => prefetchLibrarySeries(id),
				to: 'series',
			},
			{
				isActive: location.pathname.match(/\/libraries\/[^/]+\/books(\/.*)?$/),
				label: 'Books',
				onHover: () => prefetchLibraryMedia(id),
				to: 'books',
			},
			...(canAccessFiles
				? [
						{
							isActive: location.pathname.match(/\/libraries\/[^/]+\/files(\/.*)?$/),
							label: 'Files',
							onHover: () => prefetchLibraryFiles(path),
							to: 'files',
						},
					]
				: []),
			{
				isActive: location.pathname.match(/\/libraries\/[^/]+\/settings(\/.*)?$/),
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
						className={cn('whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium', {
							'border-brand-500 text-brand-500': tab.isActive,
							'border-transparent text-foreground-muted hover:border-edge': !tab.isActive,
						})}
					>
						{tab.label}
					</Link>
				))}
			</nav>
		</div>
	)
}
