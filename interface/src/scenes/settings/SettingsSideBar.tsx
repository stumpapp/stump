import { useAppProps } from '@stump/client'
import { Label } from '@stump/components'
import { useLocation } from 'react-router'

import { useLocaleContext } from '@/i18n'

import { routeGroups } from './routes'
import SettingsSideBarLink from './SettingsSideBarLink'

export default function SettingsSideBar() {
	const location = useLocation()

	const { t } = useLocaleContext()
	const { platform } = useAppProps()

	return (
		<div className="border-edge bg-background text-contrast-200 relative flex h-full w-48 shrink-0 flex-col gap-4 border-r px-2 py-4">
			{routeGroups.map((group) => {
				const groupLabel = t(`settingsScene.sidebar.${group.label.toLowerCase()}.label`)

				const withGroup = (key: string) =>
					`settingsScene.sidebar.${group.label.toLowerCase()}.${key}`

				return (
					<div key={groupLabel}>
						<Label>{groupLabel}</Label>

						<ul className="flex flex-col gap-y-0.5 pt-2 text-sm">
							{group.items.map(({ to, icon, label, disabled }) => {
								const isDisabled = disabled || (platform === 'browser' && to.includes('desktop'))
								return (
									<SettingsSideBarLink
										key={to}
										to={to}
										isActive={location.pathname.startsWith(to)}
										isDisabled={isDisabled}
										icon={icon}
									>
										{t(withGroup(label.toLowerCase()))}
									</SettingsSideBarLink>
								)
							})}
						</ul>
					</div>
				)
			})}
		</div>
	)
}
