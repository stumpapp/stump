import { cx, Heading, Text } from '@stump/components'
import React, { useMemo } from 'react'
import { useLocation } from 'react-router'

import { useSceneContainer } from '@/components/container'
import { useLocaleContext } from '@/i18n'

import { routeGroups } from './routes'
import SettingsNavigation from './SettingsNavigation'

type Props = {
	renderNavigation?: boolean
}

export default function SettingsHeader({ renderNavigation }: Props) {
	const { t } = useLocaleContext()
	const { maxWidth } = useSceneContainer()
	const location = useLocation()

	const activeRouteGroup = useMemo(
		() =>
			routeGroups
				.flatMap((group) => group.items)
				.find((page) => location.pathname.startsWith(page.to)),
		[location.pathname],
	)

	const activeRouteKey = useMemo(() => {
		if (!activeRouteGroup) {
			return null
		}

		const matchedSubItemKey = activeRouteGroup.subItems?.find((subItem) =>
			subItem.matcher(location.pathname),
		)?.localeKey

		return matchedSubItemKey || activeRouteGroup?.localeKey
	}, [activeRouteGroup, location.pathname])

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
			<div>
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
