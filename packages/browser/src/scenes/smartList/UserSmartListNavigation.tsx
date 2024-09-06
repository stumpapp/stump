import { prefetchSmartListItems } from '@stump/client'
import { cn, Link } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React, { useMemo } from 'react'
import { useLocation } from 'react-router'

import { usePreferences } from '@/hooks'

import { useSmartListContext } from './context'

const LOCALE_BASE_KEY = 'userSmartListScene.navigation'
const withLocaleKey = (key: string) => `${LOCALE_BASE_KEY}.${key}`

export default function UserSmartListNavigation() {
	const location = useLocation()
	const { t } = useLocaleContext()
	const {
		preferences: { primary_navigation_mode, layout_max_width_px },
	} = usePreferences()
	const {
		list: { id },
	} = useSmartListContext()

	const tabs = useMemo(
		() => [
			{
				// smart-lists/ID OR smart-lists/ID/items
				isActive: location.pathname.match(/\/smart-lists\/[^/]+(\/items)?$/),
				label: t(withLocaleKey('items')),
				onHover: () => prefetchSmartListItems(id),
				to: 'items',
			},
			{
				isActive: location.pathname.match(/\/smart-lists\/[^/]+\/settings(\/.*)?$/),
				label: t(withLocaleKey('settings')),
				to: 'settings',
			},
		],
		[location, id, t],
	)

	const preferTopBar = primary_navigation_mode === 'TOPBAR'

	return (
		<div className="relative z-10 w-full border-b border-edge-subtle bg-background">
			<nav
				className={cn(
					'-mb-px flex gap-x-4 overflow-x-scroll px-3 transition-colors duration-150 scrollbar-hide md:overflow-x-hidden',
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
						className={cn('whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium', {
							'border-brand-500 text-brand-600': tab.isActive,
							'border-transparent text-foreground-muted': !tab.isActive,
						})}
						onMouseEnter={tab.onHover}
					>
						{tab.label}
					</Link>
				))}
			</nav>
		</div>
	)
}
