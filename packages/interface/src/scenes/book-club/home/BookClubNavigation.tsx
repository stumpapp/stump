import { prefetchBookClubChat } from '@stump/client'
import { cx, Link } from '@stump/components'
import React, { useMemo } from 'react'
import { useLocation } from 'react-router'

import { useBookClubContext } from './context'

// TODO: when viewing a thread, only show something like "<-- Return to chat board"
export default function BookClubNavigation() {
	const location = useLocation()
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

	return (
		<div className="sticky top-0 z-10 w-full border-b border-gray-75 bg-white dark:border-gray-850 dark:bg-gray-975 md:relative md:top-[unset] md:z-[unset]">
			<nav className="-mb-px flex gap-x-6 overflow-x-scroll px-3 scrollbar-hide md:overflow-x-hidden">
				{tabs.map((tab) => (
					<Link
						to={tab.to}
						key={tab.to}
						underline={false}
						className={cx('whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium', {
							'border-brand-500 text-brand-600 dark:text-brand-400': tab.isActive,
							'border-transparent text-gray-800 hover:border-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-gray-200':
								!tab.isActive,
						})}
					>
						{tab.label}
					</Link>
				))}
			</nav>
		</div>
	)
}
