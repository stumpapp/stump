import {
	usePrefetchLibraryBooks,
	usePrefetchLibraryFiles,
	usePrefetchLibrarySeries,
} from '@stump/client'
import { cn, Link, useSticky } from '@stump/components'
import { useMemo } from 'react'
import { useLocation } from 'react-router'
import { useMediaMatch } from 'rooks'

import { useAppContext } from '@/context'
import { usePreferences } from '@/hooks'

import { useLibraryContext } from './context'

export default function LibraryNavigation() {
	const location = useLocation()
	const isMobile = useMediaMatch('(max-width: 768px)')
	const {
		preferences: { primary_navigation_mode, layout_max_width_px },
	} = usePreferences()
	const {
		library: { id, path },
	} = useLibraryContext()
	const { checkPermission } = useAppContext()
	const { prefetch: prefetchBooks } = usePrefetchLibraryBooks({ id })
	const { prefetch: prefetchFiles } = usePrefetchLibraryFiles({
		path,
		fetchConfig: checkPermission('file:upload'),
	})
	const { prefetch: prefetchSeries } = usePrefetchLibrarySeries({ id })
	const { ref, isSticky } = useSticky<HTMLDivElement>({ extraOffset: isMobile ? 56 : 0 })

	const canAccessFiles = checkPermission('file:explorer')
	const tabs = useMemo(
		() => [
			{
				isActive: location.pathname.match(/\/libraries\/[^/]+\/?(series)?$/),
				label: 'Series',
				onHover: () => prefetchSeries(),
				to: 'series',
			},
			{
				isActive: location.pathname.match(/\/libraries\/[^/]+\/books(\/.*)?$/),
				label: 'Books',
				onHover: () => prefetchBooks(),
				to: 'books',
			},
			...(canAccessFiles
				? [
						{
							isActive: location.pathname.match(/\/libraries\/[^/]+\/files(\/.*)?$/),
							label: 'Files',
							onHover: () => prefetchFiles(),
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
		[location, canAccessFiles, prefetchBooks, prefetchFiles, prefetchSeries],
	)

	const preferTopBar = primary_navigation_mode === 'TOPBAR'

	return (
		<div
			ref={ref}
			className={cn(
				'sticky top-0 z-10 h-12 w-full border-b border-edge bg-transparent md:relative md:top-[unset] md:z-[unset]',
				{ 'bg-background': isSticky },
			)}
		>
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
							'border-edge-brand text-foreground-brand': tab.isActive,
							'border-transparent text-foreground-muted hover:border-edge': !tab.isActive,
						})}
						data-testid={`libraryNavigation-${tab.to}`}
					>
						{tab.label}
					</Link>
				))}
			</nav>
		</div>
	)
}
