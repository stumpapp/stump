import { cn, Label, NavigationMenu } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Cog } from 'lucide-react'
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
		preferences: { enableDoubleSidebar },
	} = usePreferences()
	const platform = useAppStore((store) => store.platform)

	const { groups } = useSettingsRoutes()

	const location = useLocation()
	const isInSettingsSomewhere = location.pathname.startsWith('/settings')

	const classes = cn(
		'rounded-md border border-transparent bg-sidebar text-sidebar-foreground hover:border-sidebar-border hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground data-[state=open]:border-sidebar-border data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground',
		{
			'border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground':
				isInSettingsSomewhere,
		},
		{
			'p-0 px-0 py-0 h-[2.35rem] w-[2.35rem]': enableDoubleSidebar,
		},
	)

	// If the user has the settings sidebar enabled, they likely don't need a complex
	// sub-navigation item for settings
	if (enableDoubleSidebar) {
		return (
			<TopBarNavLink to={paths.settings()} isActive={isInSettingsSomewhere} className={classes}>
				<Cog className="h-4 w-4" />
			</TopBarNavLink>
		)
	}

	const renderRouteGroups = () => {
		return groups.map(({ label, items }) => {
			// TODO: refactor the group shit
			const groupLabel = label ? t(`settingsScene.sidebar.${label.toLowerCase()}.label`) : ''

			const withGroup = (key: string) =>
				label
					? t(`settingsScene.sidebar.${label.toLowerCase()}.${key}`)
					: t(`settingsScene.sidebar.${key}`)

			return (
				<div key={groupLabel}>
					<Label>{groupLabel}</Label>

					<ul className="gap-y-0.5 pt-2 text-sm flex flex-col">
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
										<span className="ml-1 font-medium line-clamp-1">
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
			<NavigationMenu.Content className="right-0 left-auto">
				<div
					className={cn(
						'gap-x-2 p-4 md:w-100 grid justify-between',
						{
							'md:w-50 grid-cols-1': groups.length === 1,
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
