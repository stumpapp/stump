import { cn, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React, { useMemo } from 'react'
import { useLocation } from 'react-router'

import { usePreferences } from '@/hooks/usePreferences'

import { routeGroups } from './routes'

export default function LibrarySettingsHeader() {
	const location = useLocation()
	const {
		preferences: { primary_navigation_mode, layout_max_width_px },
	} = usePreferences()
	const { t } = useLocaleContext()

	const preferTopBar = primary_navigation_mode === 'TOPBAR'

	/**
	 * The active route based on the current location
	 */
	const activeRouteGroup = useMemo(
		() =>
			routeGroups
				.flatMap((group) => group.items)
				.find((page) => location.pathname.endsWith(page.to)),
		[location.pathname],
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

	const translatedHeader = t(`librarySettingsScene.${activeRouteKey}.title`)
	const translatedDescription = t(`librarySettingsScene.${activeRouteKey}.description`)

	return (
		<header
			className={cn('flex w-full flex-col border-b border-b-edge p-4 pl-52', {
				'mx-auto': preferTopBar && !!layout_max_width_px,
			})}
			style={{
				maxWidth: preferTopBar ? layout_max_width_px || undefined : undefined,
			}}
		>
			<Heading size="lg" className="font-bold">
				{translatedHeader}
			</Heading>

			<Text variant="muted" className="mt-1.5" size="sm">
				{translatedDescription}
			</Text>
		</header>
	)
}
