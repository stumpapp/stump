import { Label, NativeSelect, Tabs } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { useNavigate, useRouterContext } from '@/context'
import { useAppStore } from '@/stores'

import { useSettingsRoutes } from './useSettingsRoutes'

// TODO: update doc strings

export default function SettingsNavigation() {
	const navigate = useNavigate()
	const location = useLocation()
	const platform = useAppStore((store) => store.platform)

	const { basePath } = useRouterContext()
	const { t } = useLocaleContext()
	const { groups } = useSettingsRoutes()

	const activeRouteGroup = useMemo(
		() => groups.find((group) => group.items.some((page) => location.pathname.startsWith(page.to))),
		[location.pathname, groups],
	)

	const activeSubRoute = useMemo(
		() => activeRouteGroup?.items.find((page) => location.pathname.startsWith(page.to))?.to,
		[activeRouteGroup, location.pathname],
	)

	const selectOptions = useMemo(() => {
		const groupLabel = activeRouteGroup?.label
		if (!groupLabel) return []

		const allOptions = activeRouteGroup.items.map((item) => ({
			disabled: item.disabled,
			label: t(`settingsScene.sidebar.${groupLabel.toLowerCase()}.${item.label.toLowerCase()}`),
			value: item.to,
		}))

		if (platform === 'browser') {
			// find the option with desktop and mark it as disabled
			const desktopOption = allOptions.findIndex((option) => option.value.includes('desktop'))
			if (desktopOption !== -1 && !!allOptions[desktopOption]) {
				allOptions[desktopOption]!.disabled = true
			}
		}

		return allOptions
	}, [t, activeRouteGroup, platform])

	const renderTabs = groups.length > 1

	return (
		<div className="flex flex-col gap-y-4">
			{renderTabs && (
				<Tabs value={activeRouteGroup?.label} variant="primary" activeOnHover>
					<Tabs.List>
						{groups.map((group) => {
							const groupLabel = group.label
								? t(`settingsScene.sidebar.${group.label.toLowerCase()}.label`)
								: undefined

							return (
								<Tabs.Trigger
									key={group.label ?? group.defaultRoute}
									value={group.label ?? group.defaultRoute}
									asChild
								>
									<Link className="truncate" to={`${basePath}${group.defaultRoute}`}>
										{groupLabel}
									</Link>
								</Tabs.Trigger>
							)
						})}
					</Tabs.List>
				</Tabs>
			)}

			<div className="flex flex-col gap-y-2">
				<Label>Section</Label>
				<NativeSelect
					options={selectOptions}
					value={activeSubRoute}
					onChange={(e) => {
						navigate(e.target.value)
					}}
					className="md:max-w-xs"
				/>
			</div>
		</div>
	)
}
