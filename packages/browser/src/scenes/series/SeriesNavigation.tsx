import { usePrefetchFiles } from '@stump/client'
import { cn, Link, useSticky } from '@stump/components'
import { UserPermission } from '@stump/graphql'
import { useCallback, useMemo } from 'react'
import { useLocation } from 'react-router'
import { useMediaMatch } from 'rooks'

import { useAppContext } from '@/context'
import { usePreferences } from '@/hooks'

import { useSeriesContext } from './context'
import { usePrefetchSeriesBooks } from './tabs/books/SeriesBooksScene'

export default function SeriesNavigation() {
	const isMobile = useMediaMatch('(max-width: 768px)')
	const location = useLocation()
	const {
		preferences: { primaryNavigationMode, layoutMaxWidthPx },
	} = usePreferences()
	const {
		series: { id, path },
	} = useSeriesContext()
	const { checkPermission } = useAppContext()
	const { ref, isSticky } = useSticky<HTMLDivElement>({ extraOffset: isMobile ? 56 : 0 })

	const prefetchSeriesBooks = usePrefetchSeriesBooks()
	const handlePrefetchBooks = useCallback(() => prefetchSeriesBooks(id), [id, prefetchSeriesBooks])

	const prefetchFiles = usePrefetchFiles()
	const handlePrefetchFiles = useCallback(
		() => prefetchFiles({ path, fetchConfig: checkPermission(UserPermission.UploadFile) }),
		[path, checkPermission, prefetchFiles],
	)

	const canAccessFiles = checkPermission(UserPermission.FileExplorer)
	const tabs = useMemo(
		() => [
			{
				isActive: location.pathname.match(/\/series\/[^/]+\/books(\/.*)?$/),
				label: 'Books',
				onHover: () => handlePrefetchBooks(),
				to: 'books',
			},
			...(canAccessFiles
				? [
						{
							isActive: location.pathname.match(/\/series\/[^/]+\/files(\/.*)?$/),
							label: 'Files',
							onHover: () => handlePrefetchFiles(),
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
		[location, canAccessFiles, handlePrefetchBooks, handlePrefetchFiles],
	)

	const preferTopBar = primaryNavigationMode == 'TOPBAR'

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
						className={cn(
							'whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium',
							{
								'border-edge-brand text-foreground-brand': tab.isActive,
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
