import { SecondarySidebar } from '@/components/sharedLayout'
import { useRouterContext } from '@/context'
import { useTranslate } from '@/hooks/useTranslate'
import { usePathActive } from '@/paths'
import { useAppStore } from '@/stores'

import { useSettingsRoutes } from './useSettingsRoutes'

export default function SettingsSideBar() {
	const isActive = usePathActive()

	const { basePath } = useRouterContext()
	const { t } = useTranslate()
	const platform = useAppStore((store) => store.platform)

	const { groups } = useSettingsRoutes()

	return (
		<SecondarySidebar>
			{groups.map(({ label, items }) => {
				const groupKey = label?.toLowerCase()
				const visibleItems = items.filter(
					({ to }) => !(platform === 'browser' && to.includes('desktop')),
				)

				if (!visibleItems.length) return null

				return (
					<SecondarySidebar.Group
						key={groupKey ?? 'ungrouped'}
						label={groupKey ? t(`settingsScene.sidebar.${groupKey}.label`) : undefined}
					>
						{visibleItems.map(({ to, icon, label, disabled, prefetch }) => (
							<SecondarySidebar.Item
								key={to}
								to={`${basePath}${to}`}
								icon={icon}
								isActive={isActive(to)}
								isDisabled={disabled}
								prefetch={prefetch}
							>
								{t(`settingsScene.sidebar.${groupKey}.${label.toLowerCase()}`)}
							</SecondarySidebar.Item>
						))}
					</SecondarySidebar.Group>
				)
			})}
		</SecondarySidebar>
	)
}
