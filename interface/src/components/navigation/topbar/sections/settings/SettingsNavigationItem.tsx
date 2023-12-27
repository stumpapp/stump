import { useAppProps, usePreferences } from '@stump/client'
import { cn, Label, NavigationMenu, navigationMenuTriggerStyle } from '@stump/components'
import { Cog } from 'lucide-react'
import React from 'react'
import { useLocation } from 'react-router-dom'

import { useLocaleContext } from '@/i18n'
import paths from '@/paths'

import { routeGroups } from '../../../../../scenes/settings'
import TopBarLinkListItem from '../../TopBarLinkListItem'
import TopBarNavLink from '../../TopBarNavLink'

export default function SettingsNavigationItem() {
	const { t } = useLocaleContext()
	const {
		preferences: { enable_double_sidebar },
	} = usePreferences()
	const { platform } = useAppProps()

	const location = useLocation()
	const isInSettingsSomewhere = location.pathname.startsWith(paths.settings())

	// If the user has the settings sidebar enabled, they likely don't need a complex
	// sub-navigation item for settings
	if (enable_double_sidebar) {
		return (
			<TopBarNavLink to={paths.settings()} isActive={isInSettingsSomewhere}>
				<Cog className="mr-2 h-4 w-4" />
				Settings
			</TopBarNavLink>
		)
	}

	const renderRouteGroups = () => {
		return routeGroups.map((group) => {
			const groupLabel = t(`settingsScene.sidebar.${group.label.toLowerCase()}.label`)

			const withGroup = (key: string) => `settingsScene.sidebar.${group.label.toLowerCase()}.${key}`

			return (
				<div key={groupLabel}>
					<Label>{groupLabel}</Label>

					<ul className="flex flex-col gap-y-0.5 pt-2 text-sm">
						{group.items.map(({ to, icon, label, disabled }) => {
							const isDisabled = disabled || (platform === 'browser' && to.includes('desktop'))

							const Icon = icon

							return (
								<div key={to} className="w-full">
									<TopBarLinkListItem
										to={to}
										isActive={location.pathname.startsWith(to)}
										isDisabled={isDisabled}
									>
										<Icon className="mr-2 h-4 w-4 shrink-0" />
										<span className="ml-1 line-clamp-1 font-medium">
											{t(withGroup(label.toLowerCase()))}
										</span>
									</TopBarLinkListItem>
								</div>
							)
						})}
					</ul>
				</div>
			)
		})
	}

	return (
		<NavigationMenu.Item>
			<NavigationMenu.Trigger
				className={navigationMenuTriggerStyle({
					className: cn('bg-sidebar text-contrast-300 hover:bg-sidebar-300', {
						'bg-sidebar-300': isInSettingsSomewhere,
					}),
				})}
			>
				<Cog className="mr-2 h-4 w-4" />
				Settings
			</NavigationMenu.Trigger>
			<NavigationMenu.Content className="left-auto right-0">
				<div className="grid grid-cols-2 justify-between gap-x-2 p-4 md:w-[400px]">
					{renderRouteGroups()}
				</div>
			</NavigationMenu.Content>
		</NavigationMenu.Item>
	)
}
