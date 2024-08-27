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

	// const backlink = useMemo(() => {
	// 	const matchedSubItem = activeRouteGroup?.subItems?.find((subItem) =>
	// 		subItem.matcher(location.pathname),
	// 	)

	// 	if (matchedSubItem?.backlink) {
	// 		return matchedSubItem.backlink
	// 	} else {
	// 		return null
	// 	}
	// }, [activeRouteGroup?.subItems, location.pathname])

	const translatedHeader = t(`librarySettingsScene.${activeRouteKey}.title`)
	const translatedDescription = t(`librarySettingsScene.${activeRouteKey}.description`)

	return (
		<header
			className={cn(
				'flex w-full flex-col gap-4 border-b border-b-edge p-4 pl-52 md:flex-row md:items-start md:justify-between md:gap-0',
				{
					'mx-auto': preferTopBar && !!layout_max_width_px,
				},
			)}
			style={{
				maxWidth: preferTopBar ? layout_max_width_px || undefined : undefined,
			}}
		>
			<div className="flex w-full flex-col items-center gap-2 md:mb-2 md:items-start">
				<Heading size="lg">{translatedHeader}</Heading>

				<Text size="sm" variant="muted">
					{translatedDescription}
				</Text>
			</div>
		</header>
	)
}
