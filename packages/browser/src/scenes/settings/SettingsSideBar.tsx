import { cn, IconButton, Label } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Home } from 'lucide-react'
import { useNavigate } from 'react-router'

import { useRouterContext } from '@/context'
import { usePreferences, useTheme } from '@/hooks'
import { usePathActive, usePaths } from '@/paths'
import { useAppStore } from '@/stores'

import SettingsSideBarLink from './SettingsSideBarLink'
import { useSettingsRoutes } from './useSettingsRoutes'

export default function SettingsSideBar() {
	const navigate = useNavigate()
	const paths = usePaths()

	const isActive = usePathActive()

	const { basePath } = useRouterContext()
	const { t } = useLocaleContext()
	const platform = useAppStore((store) => store.platform)
	const {
		preferences: { enableReplacePrimarySidebar, primaryNavigationMode },
	} = usePreferences()
	const { shouldUseGradient } = useTheme()

	const { groups } = useSettingsRoutes()

	return (
		<div
			className={cn(
				'w-48 px-2 py-4 relative flex h-full shrink-0 flex-col border-edge bg-background text-foreground-subtle',
				primaryNavigationMode === 'TOPBAR'
					? 'top-12 fixed z-50 h-screen border-r'
					: 'top-0 fixed z-50 h-screen border-r',
				{
					'from-background-gradient-from to-background-gradient-to bg-linear-to-l':
						shouldUseGradient,
				},
			)}
		>
			<div className="gap-4 flex h-full grow flex-col">
				{groups
					.map(({ label, items }) => {
						const groupLabel = label
							? t(`settingsScene.sidebar.${label.toLowerCase()}.label`)
							: undefined

						const withGroup = (key: string) =>
							`settingsScene.sidebar.${label?.toLowerCase()}.${key}`

						return (
							<div key={groupLabel}>
								{groupLabel && <Label>{groupLabel}</Label>}

								<ul className="gap-y-0.5 pt-2 text-sm flex flex-col">
									{items.map(({ to, icon, label, disabled, prefetch }) => {
										if (platform === 'browser' && to.includes('desktop')) {
											return null
										}

										return (
											<SettingsSideBarLink
												key={to}
												to={`${basePath}${to}`}
												isActive={isActive(to)}
												isDisabled={disabled}
												icon={icon}
												prefetch={prefetch}
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

				{enableReplacePrimarySidebar && (
					<div className="shrink-0">
						<IconButton
							title="Go home"
							variant="ghost"
							className="p-1.5 border border-transparent text-foreground hover:border-edge-subtle/50 hover:bg-sidebar-surface/70"
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
