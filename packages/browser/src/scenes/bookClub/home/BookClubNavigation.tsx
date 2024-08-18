import { prefetchBookClubChat } from '@stump/client'
import { cn, cx, Link } from '@stump/components'
import React, { useMemo } from 'react'
import { useLocation } from 'react-router'

import { usePreferences } from '@/hooks'

import { useBookClubContext } from './context'

// TODO: when viewing a thread, only show something like "<-- Return to chat board"
export default function BookClubNavigation() {
	const location = useLocation()
	const {
		preferences: { primary_navigation_mode, layout_max_width_px },
	} = usePreferences()
	const {
		bookClub: { id },
		viewerIsMember,
	} = useBookClubContext()

	const tabs = useMemo(() => {
		const base = [
			{
				isActive: location.pathname.match(/\/book-clubs\/[^/]+\/?(overview)?$/),
				label: 'Overview',
				to: 'overview',
			},
		]

		if (!viewerIsMember) {
			return base
		}

		return [
			...base,
			{
				isActive: location.pathname.match(/\/book-clubs\/[^/]+\/chat-board(\/.*)?$/),
				label: 'Chat Board',
				onHover: () => prefetchBookClubChat(id),
				to: 'chat-board',
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
	}, [location, viewerIsMember, id])

	const preferTopBar = primary_navigation_mode === 'TOPBAR'

	return (
		<div className="sticky top-0 z-10 w-full border-b border-edge bg-background md:relative md:top-[unset] md:z-[unset]">
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
						className={cx('whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium', {
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
