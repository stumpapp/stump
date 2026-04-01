import { cn, Link } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useMemo } from 'react'
import { useLocation } from 'react-router'

import { usePreferences } from '@/hooks'

import { useSmartListContext } from './context'
import { usePrefetchSmartList } from './graphql'

const LOCALE_BASE_KEY = 'userSmartListScene.navigation'
const withLocaleKey = (key: string) => `${LOCALE_BASE_KEY}.${key}`

export default function UserSmartListNavigation() {
	const location = useLocation()
	const { t } = useLocaleContext()
	const {
		preferences: { primaryNavigationMode, layoutMaxWidthPx },
	} = usePreferences()
	const {
		list: { id },
	} = useSmartListContext()
	const { prefetch } = usePrefetchSmartList()

	const tabs = useMemo(
		() => [
			{
				// smart-lists/ID OR smart-lists/ID/items
				isActive: location.pathname.match(/\/smart-lists\/[^/]+(\/items)?$/),
				label: t(withLocaleKey('items')),
				onHover: () => prefetch({ id }),
				to: 'items',
			},
			{
				isActive: location.pathname.match(/\/smart-lists\/[^/]+\/settings(\/.*)?$/),
				label: t(withLocaleKey('settings')),
				to: 'settings',
			},
		],
		[location, prefetch, t, id],
	)

	const preferTopBar = primaryNavigationMode === 'TOPBAR'

	return (
		<div className="relative z-10 w-full border-b border-edge-subtle bg-background">
			<nav
				className={cn(
					'gap-x-4 px-3 md:overflow-x-hidden -mb-px scrollbar-hide flex overflow-x-scroll transition-colors duration-150',
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
						className={cn('px-1 py-3 text-sm font-medium border-b-2 whitespace-nowrap', {
							'border-edge-brand text-foreground-brand': tab.isActive,
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
