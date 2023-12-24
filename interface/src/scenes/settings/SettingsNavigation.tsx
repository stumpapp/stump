import { useAppProps } from '@stump/client'
import { Label, NativeSelect, Tabs } from '@stump/components'
import { User } from '@stump/types'
import { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useLocaleContext } from '@/i18n'

import { routeGroups } from './routes'

type Props = {
	user?: User | null
}

// TODO: update doc strings

export default function SettingsNavigation({ user }: Props) {
	const navigate = useNavigate()
	const location = useLocation()

	const { t } = useLocaleContext()
	const { platform } = useAppProps()

	const visibleGroups = useMemo(
		() =>
			!user?.is_server_owner
				? routeGroups
				: routeGroups.filter((group) => group.label.toLowerCase() !== 'server'),
		[user],
	)

	const activeRouteGroup = useMemo(
		() =>
			visibleGroups.find((group) =>
				group.items.some((page) => location.pathname.startsWith(page.to)),
			),
		[location.pathname, visibleGroups],
	)

	const activeSubRoute = useMemo(
		() => activeRouteGroup?.items.find((page) => location.pathname.startsWith(page.to))?.to,
		[activeRouteGroup, location.pathname],
	)

	const selectOptions = useMemo(() => {
		const allOptions =
			activeRouteGroup?.items.map((item) => ({
				disabled: item.disabled,
				label: t(
					`settingsScene.sidebar.${activeRouteGroup.label.toLowerCase()}.${item.label.toLowerCase()}`,
				),
				value: item.to,
			})) ?? []

		if (platform === 'browser') {
			// find the option with desktop and mark it as disabled
			const desktopOption = allOptions.findIndex((option) => option.value.includes('desktop'))
			if (desktopOption !== -1 && !!allOptions[desktopOption]) {
				allOptions[desktopOption]!.disabled = true
			}
		}

		return allOptions
	}, [t, activeRouteGroup, platform])

	const renderTabs = visibleGroups.length > 1

	return (
		<div className="flex flex-col gap-y-4">
			{renderTabs && (
				<Tabs value={activeRouteGroup?.label} variant="primary" activeOnHover>
					<Tabs.List>
						{visibleGroups.map((group) => (
							<Tabs.Trigger key={group.label} value={group.label} asChild>
								<Link className="truncate" to={group.defaultRoute}>
									{t(`settingsScene.sidebar.${group.label.toLowerCase()}.label`)}
								</Link>
							</Tabs.Trigger>
						))}
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
				/>
			</div>
		</div>
	)
}
