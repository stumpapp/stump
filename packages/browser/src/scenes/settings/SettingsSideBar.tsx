import { cn, Label } from '@stump/components'

import { useRouterContext } from '@/context'
import { useTheme } from '@/hooks'
import { useTranslate } from '@/hooks/useTranslate'
import { usePathActive } from '@/paths'
import { useAppStore } from '@/stores'

import SettingsSideBarLink from './SettingsSideBarLink'
import { useSettingsRoutes } from './useSettingsRoutes'

export default function SettingsSideBar() {
	const isActive = usePathActive()

	const { basePath } = useRouterContext()
	const { t } = useTranslate()
	const platform = useAppStore((store) => store.platform)
	const { shouldUseGradient } = useTheme()

	const { groups } = useSettingsRoutes()

	return (
		<div
			className={cn(
				'top-0 w-48 px-2 py-4 sticky z-40 flex h-(--main-height) shrink-0 flex-col self-start border-r border-border bg-background text-foreground',
				{
					'bg-linear-to-l from-background-gradient-from to-background-gradient-to':
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
								{groupLabel && <Label className="text-muted-foreground">{groupLabel}</Label>}

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
			</div>
		</div>
	)
}
