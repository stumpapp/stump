import { cn, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useMemo } from 'react'
import { useLocation } from 'react-router'
import { useMediaMatch } from 'rooks'

import { usePreferences } from '@/hooks/usePreferences'

import LibrarySettingsSelectNavigation from './LibrarySettingsSelectNavigation'
import { LibraryPatternDisplay } from './options/scanner'
import { routeGroups } from './routes'

export default function LibrarySettingsHeader() {
	const location = useLocation()
	const {
		preferences: { primaryNavigationMode, layoutMaxWidthPx, enableDoubleSidebar },
	} = usePreferences()
	const { t } = useLocaleContext()

	const isMobile = useMediaMatch('(max-width: 768px)')
	const preferTopBar = primaryNavigationMode === 'TOPBAR'
	const displayingSideBar = !!enableDoubleSidebar && !isMobile

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

	const isScannerSettings = activeRouteKey === 'options/scanning'

	return (
		<header
			className={cn(
				'flex w-full flex-col items-start justify-between gap-4 border-b border-b-edge p-4 lg:flex-row lg:gap-0',
				{
					// Note: We make the border transparent because the width constraint when using a top bar
					'mx-auto border-b-transparent': preferTopBar && !!layoutMaxWidthPx,
					'pl-52': displayingSideBar,
				},
			)}
			style={{
				maxWidth: preferTopBar ? layoutMaxWidthPx || undefined : undefined,
			}}
		>
			<div className="flex flex-col space-y-4">
				<div>
					<Heading size="lg" className="font-bold">
						{translatedHeader}
					</Heading>

					<Text variant="muted" className="mt-1.5" size="sm">
						{translatedDescription}
					</Text>
				</div>
			</div>

			{isScannerSettings && <LibraryPatternDisplay />}

			{isMobile && <LibrarySettingsSelectNavigation />}
		</header>
	)
}
