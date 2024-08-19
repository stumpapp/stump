import { cn, Label, NavigationMenu } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Cog } from 'lucide-react'
import React from 'react'
import { useLocation } from 'react-router-dom'

import { usePreferences } from '@/hooks'
import paths from '@/paths'
import { useSettingsRoutes } from '@/scenes/settings'
import { useAppStore } from '@/stores'

import TopBarLinkListItem from '../../TopBarLinkListItem'
import TopBarNavLink from '../../TopBarNavLink'

export default function SettingsNavigationItem() {
	const { t } = useLocaleContext()
	const {
		preferences: { enable_double_sidebar },
	} = usePreferences()
	const platform = useAppStore((store) => store.platform)

	const { groups } = useSettingsRoutes()

	const location = useLocation()
	const isInSettingsSomewhere = location.pathname.startsWith('/settings')

	const classes = cn(
		'rounded-full border border-transparent border-opacity-80 bg-sidebar text-foreground-subtle hover:border-edge-subtle hover:border-opacity-100 hover:bg-background-surface/50 data-[state=open]:border-edge-subtle data-[state=open]:border-opacity-100 data-[state=open]:bg-background-surface/50',
		{
			'border-edge-subtle border-opacity-100 bg-background-surface/50': isInSettingsSomewhere,
		},
		{
			'h-[2.35rem] w-[2.35rem] p-0 px-0 py-0': enable_double_sidebar,
		},
	)

	// If the user has the settings sidebar enabled, they likely don't need a complex
	// sub-navigation item for settings
	if (enable_double_sidebar) {
		return (
			<TopBarNavLink to={paths.settings()} isActive={isInSettingsSomewhere} className={classes}>
				<Cog className="h-4 w-4" />
			</TopBarNavLink>
		)
	}

	const renderRouteGroups = () => {
		return groups.map(({ label, items }) => {
			const groupLabel = t(`settingsScene.sidebar.${label.toLowerCase()}.label`)

			const withGroup = (key: string) => `settingsScene.sidebar.${label.toLowerCase()}.${key}`

			return (
				<div key={groupLabel}>
					<Label>{groupLabel}</Label>

					<ul className="flex flex-col gap-y-0.5 pt-2 text-sm">
						{items.map(({ to, icon, label, disabled }) => {
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
			<NavigationMenu.Trigger className={classes} showChevron={false}>
				<Cog className="h-4 w-4" />
			</NavigationMenu.Trigger>
			<NavigationMenu.Content className="left-auto right-0">
				<div
					className={cn(
						'grid justify-between gap-x-2 p-4 md:w-[400px]',
						{
							'grid-cols-1 md:w-[200px]': groups.length === 1,
						},
						{ 'grid-cols-2': groups.length === 2 },
					)}
				>
					{renderRouteGroups()}
				</div>
			</NavigationMenu.Content>
		</NavigationMenu.Item>
	)
}
