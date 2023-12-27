import { useAppProps, usePreferences } from '@stump/client'
import { cn, IconButton, Label } from '@stump/components'
import { Home } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'

import { useLocaleContext } from '@/i18n'
import paths from '@/paths'

import { routeGroups } from './routes'
import SettingsSideBarLink from './SettingsSideBarLink'

export default function SettingsSideBar() {
	const location = useLocation()
	const navigate = useNavigate()

	const { t } = useLocaleContext()
	const { platform } = useAppProps()

	const {
		preferences: { enable_replace_primary_sidebar, primary_navigation_mode },
	} = usePreferences()

	return (
		<div
			className={cn(
				'relative flex h-full w-48 shrink-0 flex-col border-edge bg-background px-2 py-4 text-contrast-200',
				primary_navigation_mode === 'TOPBAR' ? 'fixed top-12 z-50 h-screen border-x' : 'border-r',
			)}
		>
			<div className="flex h-full flex-grow flex-col gap-4">
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
				<div className="flex-1" />

				{enable_replace_primary_sidebar && (
					<div className="shrink-0">
						<IconButton
							title="Go home"
							variant="ghost"
							className="border border-transparent p-1.5 text-contrast hover:border-edge-200/50 hover:bg-sidebar-200/70"
							onClick={() => navigate(paths.home())}
						>
							<Home className="h-4 w-4 -scale-x-[1] transform" />
						</IconButton>
					</div>
				)}
			</div>
		</div>
	)
}
