import { cn, cx, Link } from '@stump/components'
import { noop } from 'lodash'
import { useMemo } from 'react'
import { useLocation } from 'react-router'

import { useBookClubContext } from '@/components/bookClub'
import { usePreferences } from '@/hooks'

// TODO(book-clubs): Implement
// TODO: when viewing a thread, only show something like "<-- Return to chat board"
export default function BookClubNavigation() {
	const location = useLocation()
	const {
		preferences: { primaryNavigationMode, layoutMaxWidthPx },
	} = usePreferences()
	const { viewerIsMember } = useBookClubContext()
	// const { prefetch } = usePrefetchClubChat({ id })
	const prefetch = noop

	const tabs = useMemo(() => {
		const base = [
			{
				isActive: location.pathname.match(/\/clubs\/[^/]+\/?(home)?$/),
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
				isActive: location.pathname.match(/\/clubs\/[^/]+\/discussion(\/.*)?$/),
				label: 'Discussion',
				onHover: () => prefetch(),
				to: 'discussion',
			},
			{
				isActive: location.pathname.match(/\/clubs\/[^/]+\/members(\/.*)?$/),
				label: 'Members',
				to: 'members',
			},
			{
				isActive: location.pathname.match(/\/clubs\/[^/]+\/settings(\/.*)?$/),
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
		<div className="top-0 md:relative md:top-[unset] md:z-[unset] sticky z-10 w-full border-b border-edge bg-background">
			<nav
				className={cn(
					'gap-x-6 px-3 md:overflow-x-hidden -mb-px scrollbar-hide flex overflow-x-scroll',
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
						className={cx('px-1 py-3 text-sm font-medium border-b-2 whitespace-nowrap', {
							'text-brand border-edge-brand': tab.isActive,
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
