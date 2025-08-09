import { cn, cx, Link } from '@stump/components'
import { noop } from 'lodash'
import { useMemo } from 'react'
import { useLocation } from 'react-router'

import { useBookClubContext } from '@/components/bookClub'
import { usePreferences } from '@/hooks'

// TODO: when viewing a thread, only show something like "<-- Return to chat board"
export default function BookClubNavigation() {
	const location = useLocation()
	const {
		preferences: { primaryNavigationMode, layoutMaxWidthPx },
	} = usePreferences()
	const {
		bookClub: { id },
		viewerIsMember,
	} = useBookClubContext()
	// const { prefetch } = usePrefetchClubChat({ id })
	// TODO(graphql): Fix
	const prefetch = noop

	const tabs = useMemo(() => {
		const base = [
			{
				isActive: location.pathname.match(/\/book-clubs\/[^/]+\/?(home)?$/),
				label: 'Home',
				to: '.',
			},
		]

		if (!viewerIsMember) {
			return base
		}

		return [
			...base,
			{
				isActive: location.pathname.match(/\/book-clubs\/[^/]+\/discussion(\/.*)?$/),
				label: 'Discussion',
				onHover: () => prefetch(),
				to: 'discussion',
			},
			{
				isActive: location.pathname.match(/\/book-clubs\/[^/]+\/members(\/.*)?$/),
				label: 'Members',
				to: 'members',
			},
			{
				isActive: location.pathname.match(/\/book-clubs\/[^/]+\/settings(\/.*)?$/),
				label: 'Settings',
				to: 'settings',
			},
		]
	}, [location, viewerIsMember, prefetch])

	const preferTopBar = primaryNavigationMode === 'TOPBAR'

	// Don't bother rendering navigation if the user doesn't have access to any other tabs
	if (tabs.length <= 1) {
		return null
	}

	return (
		<div className="sticky top-0 z-10 w-full border-b border-edge bg-background md:relative md:top-[unset] md:z-[unset]">
			<nav
				className={cn(
					'-mb-px flex gap-x-6 overflow-x-scroll px-3 scrollbar-hide md:overflow-x-hidden',
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
						className={cx('whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium', {
							'border-edge-brand text-brand': tab.isActive,
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
