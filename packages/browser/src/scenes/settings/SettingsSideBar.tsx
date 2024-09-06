import { cn, IconButton, Label } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Home } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'

import { usePreferences } from '@/hooks'
import paths from '@/paths'
import { useAppStore } from '@/stores'

import SettingsSideBarLink from './SettingsSideBarLink'
import { useSettingsRoutes } from './useSettingsRoutes'

export default function SettingsSideBar() {
	const location = useLocation()
	const navigate = useNavigate()

	const { t } = useLocaleContext()
	const platform = useAppStore((store) => store.platform)
	const {
		preferences: { enable_replace_primary_sidebar, primary_navigation_mode },
	} = usePreferences()

	const { groups } = useSettingsRoutes()

	return (
		<div
			className={cn(
				'relative flex h-full w-48 shrink-0 flex-col border-edge bg-background px-2 py-4 text-foreground-subtle',
				primary_navigation_mode === 'TOPBAR'
					? 'fixed top-12 z-50 h-screen border-x'
					: 'fixed top-0 z-50 h-screen border-r',
			)}
		>
			<div className="flex h-full flex-grow flex-col gap-4">
				{groups
					.map(({ label, items }) => {
						const groupLabel = t(`settingsScene.sidebar.${label.toLowerCase()}.label`)

						const withGroup = (key: string) => `settingsScene.sidebar.${label.toLowerCase()}.${key}`

						return (
							<div key={groupLabel}>
								<Label>{groupLabel}</Label>

								<ul className="flex flex-col gap-y-0.5 pt-2 text-sm">
									{items.map(({ to, icon, label, disabled }) => {
										const isDisabled =
											disabled || (platform === 'browser' && to.includes('desktop'))
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
					})
					.filter(Boolean)}
				<div className="flex-1" />

				{enable_replace_primary_sidebar && (
					<div className="shrink-0">
						<IconButton
							title="Go home"
							variant="ghost"
							className="border border-transparent p-1.5 text-foreground hover:border-edge-subtle/50 hover:bg-sidebar-surface/70"
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
