import { ButtonOrLink, cn, Label } from '@stump/components'
import { ArrowLeft } from 'lucide-react'
import { useMemo } from 'react'
import { useLocation } from 'react-router'

import { formatRouteKey } from '@/hooks/useRouteGroups'
import { useTranslate } from '@/hooks/useTranslate'
import { usePaths } from '@/paths'
import SideBarLinkButton from '@/scenes/settings/SettingsSideBarLink'

import { useSmartListContext } from '../context'
import { createRouteGroups } from './routes'

export default function SmartListSettingsSideBar() {
	const location = useLocation()
	const routerPaths = usePaths()

	const { list, viewerRole } = useSmartListContext()
	const { t } = useTranslate()
	const groups = useMemo(() => createRouteGroups(list.id, viewerRole), [list.id, viewerRole])

	return (
		<div className="top-0 w-48 px-2 py-4 sticky z-40 flex h-(--main-height) shrink-0 flex-col self-start border-r border-border bg-background text-foreground">
			<div className="gap-4 flex h-full grow flex-col">
				<div className="space-x-2 flex items-center">
					<ButtonOrLink
						href={routerPaths.smartListItems(list.id)}
						replace
						variant="ghost"
						className="p-1 h-[unset] w-[unset] shrink-0 border border-transparent text-foreground hover:border-border hover:bg-accent hover:text-accent-foreground"
						size="sm"
					>
						<ArrowLeft className="h-4 w-4 transform" />
					</ButtonOrLink>

					<Label className="py-1 line-clamp-1">{list.name}</Label>
				</div>

				{groups
					.map(({ label, items }) => {
						const groupLabel = label
							? t(`smartListSettingsScene.sidebar.${formatRouteKey(label)}.label`)
							: ''

						const withGroup = (key: string) =>
							label
								? t(
										`smartListSettingsScene.sidebar.${formatRouteKey(label)}.${formatRouteKey(key)}`,
									)
								: t(`smartListSettingsScene.sidebar.${formatRouteKey(key)}`)

						return (
							<div key={groupLabel}>
								{groupLabel && <Label>{groupLabel}</Label>}
								<ul
									className={cn('gap-y-0.5 text-sm flex flex-col', {
										'pt-2': groupLabel,
									})}
								>
									{items.map(({ to, icon, label, disabled }) => {
										return (
											<SideBarLinkButton
												key={to}
												to={to}
												isActive={location.pathname.includes(to)}
												isDisabled={disabled}
												icon={icon}
											>
												{withGroup(label)}
											</SideBarLinkButton>
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
