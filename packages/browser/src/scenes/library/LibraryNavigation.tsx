// import {
// 	usePrefetchFiles,
// 	usePrefetchLibraryBooks,
// 	usePrefetchLibraryFiles,
// 	usePrefetchLibrarySeries,
// } from '@stump/client'
import { cn, Link, useSticky } from '@stump/components'
import { UserPermission } from '@stump/graphql'
import { useCallback, useMemo } from 'react'
import { useLocation } from 'react-router'
import { useMediaMatch } from 'rooks'

import { useAppContext } from '@/context'
import { usePreferences } from '@/hooks'

import { useLibraryContext } from './context'
import { usePrefetchLibraryBooks } from './tabs/books/LibraryBooksScene'
import { usePrefetchLibrarySeries } from './tabs/series'

export default function LibraryNavigation() {
	const location = useLocation()
	const isMobile = useMediaMatch('(max-width: 768px)')
	const {
		preferences: { primaryNavigationMode, layoutMaxWidthPx },
	} = usePreferences()
	const {
		library: { id, path },
	} = useLibraryContext()
	const { checkPermission } = useAppContext()
	// const { prefetch: prefetchBooks } = usePrefetchLibraryBooks({ id })
	// const { prefetch: prefetchFiles } = usePrefetchLibraryFiles({
	// 	path,
	// 	fetchConfig: checkPermission('file:upload'),
	// })
	// const { prefetch: prefetchSeries } = usePrefetchLibrarySeries({ id })

	const prefetchSeries = usePrefetchLibrarySeries()
	const prefetchBooks = usePrefetchLibraryBooks()

	// const prefetchFiles = usePrefetchFiles()
	const handlePrefetchFiles = useCallback(() => {
		// prefetchFiles({ path, fetchConfig: checkPermission('file:upload') })
	}, [path, checkPermission])

	const { ref, isSticky } = useSticky<HTMLDivElement>({
		extraOffset: isMobile || primaryNavigationMode === 'TOPBAR' ? 56 : 0,
	})

	const canAccessFiles = checkPermission(UserPermission.FileExplorer)
	const tabs = useMemo(
		() => [
			{
				isActive: location.pathname.match(/\/libraries\/[^/]+\/?(series)?$/),
				label: 'Series',
				onHover: () => prefetchSeries(id),
				to: 'series',
			},
			{
				isActive: location.pathname.match(/\/libraries\/[^/]+\/books(\/.*)?$/),
				label: 'Books',
				onHover: () => prefetchBooks(id),
				to: 'books',
			},
			...(canAccessFiles
				? [
						{
							isActive: location.pathname.match(/\/libraries\/[^/]+\/files(\/.*)?$/),
							label: 'Files',
							onHover: () => handlePrefetchFiles(),
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
		[location, canAccessFiles, prefetchSeries, prefetchBooks, handlePrefetchFiles, id],
	)

	const preferTopBar = primaryNavigationMode === 'TOPBAR'

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
						'mx-auto': preferTopBar && !!layoutMaxWidthPx,
					},
				)}
				style={{ maxWidth: preferTopBar ? layoutMaxWidthPx || undefined : undefined }}
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
					>
						{tab.label}
					</Link>
				))}
			</nav>
		</div>
	)
}
