import { Button, ButtonOrLink, cn, Label } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { ArrowLeft, Home } from 'lucide-react'
import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { usePreferences } from '@/hooks/usePreferences'
import { formatRouteKey } from '@/hooks/useRouteGroups'
import paths from '@/paths'
import { SideBarLinkButton } from '@/scenes/settings'

import { useSmartListContext } from '../context'
import { createRouteGroups } from './routes'

export default function SmartListSettingsSideBar() {
	const location = useLocation()
	const navigate = useNavigate()

	const { list, viewerRole } = useSmartListContext()
	const { t } = useLocaleContext()
	const {
		preferences: { enableReplacePrimarySidebar, primaryNavigationMode },
	} = usePreferences()
	const groups = useMemo(() => createRouteGroups(viewerRole), [viewerRole])

	return (
		<div
			className={cn(
				'w-48 px-2 py-4 relative flex h-full shrink-0 flex-col border-edge bg-background text-foreground-subtle',
				primaryNavigationMode === 'TOPBAR'
					? 'top-12 fixed z-50 h-screen border-r'
					: 'top-0 fixed z-50 h-screen border-r',
			)}
		>
			<div className="gap-4 flex h-full grow flex-col">
				<div className="space-x-2 flex items-center">
					<ButtonOrLink
						href="."
						variant="ghost"
						className="p-1 h-[unset] w-[unset] shrink-0 border border-transparent text-foreground hover:border-edge-subtle/50 hover:bg-sidebar-surface/70"
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
				<div className="flex-1" />

				{enableReplacePrimarySidebar && (
					<div className="shrink-0">
						<Button
							size="icon"
							title="Go home"
							variant="ghost"
							className="p-1.5 border border-transparent text-foreground hover:border-edge-subtle/50 hover:bg-sidebar-surface/70"
							onClick={() => navigate(paths.home())}
						>
							<Home className="h-4 w-4 -scale-x-[1] transform" />
						</Button>
					</div>
				)}
			</div>
		</div>
	)
}
