import { cn, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React, { useMemo } from 'react'
import { useLocation } from 'react-router'
import { useMediaMatch } from 'rooks'

import { usePreferences } from '@/hooks/usePreferences'
import { RouteGroup } from '@/hooks/useRouteGroups'

import GenericSettingsSelectNavigation from './GenericSettingsSelectNavigation'

type Props = {
	localeBase: string
	routeGroups: RouteGroup[]
}

export default function GenericSettingsHeader({ localeBase, routeGroups }: Props) {
	const location = useLocation()
	const {
		preferences: { primary_navigation_mode, layout_max_width_px },
	} = usePreferences()
	const { t } = useLocaleContext()

	const isMobile = useMediaMatch('(max-width: 768px)')
	const preferTopBar = primary_navigation_mode === 'TOPBAR'

	/**
	 * The active route based on the current location
	 */
	const activeRouteGroup = useMemo(
		() =>
			routeGroups
				.flatMap((group) => group.items)
				.find((page) => location.pathname.endsWith(page.to)),
		[location.pathname, routeGroups],
	)

	/**
	 * The active route's locale key, which is used to pull the title and description. If
	 * the active route has sub-items, we'll have to check the provided matchers to see
	 * if/which sub-item is active
	 */
	const activeRouteKey = useMemo(() => {
		if (!activeRouteGroup) {
			return null
		}

		const matchedSubItemKey = activeRouteGroup.subItems?.find((subItem) =>
			subItem.matcher(location.pathname),
		)?.localeKey

		return matchedSubItemKey || activeRouteGroup?.localeKey
	}, [activeRouteGroup, location.pathname])

	const translatedHeader = t(`${localeBase}.${activeRouteKey}.title`)
	const translatedDescription = t(`${localeBase}.${activeRouteKey}.description`)

	return (
		<header
			className={cn('flex w-full flex-col space-y-4 border-b border-b-edge p-4 md:pl-52', {
				// Note: We make the border transparent because the width constraint when using a top bar
				'mx-auto border-b-transparent': preferTopBar && !!layout_max_width_px,
			})}
			style={{
				maxWidth: preferTopBar ? layout_max_width_px || undefined : undefined,
			}}
		>
			<div>
				<Heading size="lg" className="font-bold">
					{translatedHeader}
				</Heading>

				<Text variant="muted" className="mt-1.5" size="sm">
					{translatedDescription}
				</Text>
			</div>

			{isMobile && (
				<GenericSettingsSelectNavigation localeBase={localeBase} routeGroups={routeGroups} />
			)}
		</header>
	)
}
