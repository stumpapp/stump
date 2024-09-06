import { cx, Heading, Link, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React, { useMemo } from 'react'
import { useLocation } from 'react-router'

import { useSceneContainer } from '@/components/container'

import { routeGroups } from './routes'
import SettingsNavigation from './SettingsNavigation'

type Props = {
	renderNavigation?: boolean
}

/**
 * A header for the settings scene, which pulls a header and optional description from
 * the locale files based on the current route
 */
export default function SettingsHeader({ renderNavigation }: Props) {
	const { t } = useLocaleContext()
	const { maxWidth } = useSceneContainer()
	const location = useLocation()

	/**
	 * The active route based on the current location
	 */
	const activeRouteGroup = useMemo(
		() =>
			routeGroups
				.flatMap((group) => group.items)
				.find((page) => location.pathname.startsWith(page.to)),
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

	const backlink = useMemo(() => {
		const matchedSubItem = activeRouteGroup?.subItems?.find((subItem) =>
			subItem.matcher(location.pathname),
		)

		if (matchedSubItem?.backlink) {
			return matchedSubItem.backlink
		} else {
			return null
		}
	}, [activeRouteGroup?.subItems, location.pathname])

	const translatedHeader = t(`settingsScene.${activeRouteKey}.title`)

	const descriptionKey = `settingsScene.${activeRouteKey}.description`
	const translatedDescription = t(`settingsScene.${activeRouteKey}.description`)

	return (
		<header
			className={cx(
				'px-4 pt-4',
				{ 'flex flex-col gap-y-8': renderNavigation },
				{ 'mx-auto': !!maxWidth },
			)}
			style={{ maxWidth }}
		>
			{renderNavigation && <SettingsNavigation />}
			<div className="text-foreground-muted">
				{backlink && (
					<span className="flex items-center gap-x-1 text-xs text-foreground-muted">
						<Link to={backlink.to} className="text-foreground-muted no-underline hover:underline">
							{t(`settingsScene.${backlink.localeKey}`) ?? 'Back'}
						</Link>
						{' /'}
					</span>
				)}
				<Heading size="lg" className="font-bold">
					{translatedHeader}
				</Heading>
				{translatedDescription && translatedDescription !== descriptionKey && (
					<Text variant="muted" className="mt-1.5" size="sm">
						{translatedDescription}
					</Text>
				)}
			</div>
		</header>
	)
}
