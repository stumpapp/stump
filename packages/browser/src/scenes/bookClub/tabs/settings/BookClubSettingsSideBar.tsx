import { Button, ButtonOrLink, cn, Label } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { ArrowLeft, Home } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'

import { useBookClubContext } from '@/components/bookClub'
import { usePreferences } from '@/hooks/usePreferences'
import { formatRouteKey, useRouteGroups } from '@/hooks/useRouteGroups'
import paths from '@/paths'
import { SideBarLinkButton } from '@/scenes/settings'

import { routeGroups } from './routes'

export default function BookClubSettingsSideBar() {
	const location = useLocation()
	const navigate = useNavigate()

	const { bookClub } = useBookClubContext()
	const { t } = useLocaleContext()
	const {
		preferences: { enableReplacePrimarySidebar, primaryNavigationMode },
	} = usePreferences()
	const { groups } = useRouteGroups({ routeGroups })

	return (
		<div
			className={cn(
				'relative flex h-full w-48 shrink-0 flex-col border-edge bg-background px-2 py-4 text-foreground-subtle',
				primaryNavigationMode === 'TOPBAR'
					? 'fixed top-12 z-50 h-screen border-r'
					: 'fixed top-0 z-50 h-screen border-r',
			)}
		>
			<div className="flex h-full flex-grow flex-col gap-4">
				<div className="flex items-center space-x-2">
					<ButtonOrLink
						href="."
						variant="ghost"
						className="h-[unset] w-[unset] shrink-0 border border-transparent p-1 text-foreground hover:border-edge-subtle/50 hover:bg-sidebar-surface/70"
						size="sm"
					>
						<ArrowLeft className="h-4 w-4 transform" />
					</ButtonOrLink>

					<Label className="line-clamp-1 py-1">{bookClub.name}</Label>
				</div>

				{groups
					.map(({ label, items }) => {
						const groupLabel = label
							? t(`bookClubSettingsScene.sidebar.${formatRouteKey(label)}.label`)
							: ''

						const withGroup = (key: string) =>
							label
								? t(`bookClubSettingsScene.sidebar.${formatRouteKey(label)}.${formatRouteKey(key)}`)
								: t(`bookClubSettingsScene.sidebar.${formatRouteKey(key)}`)

						return (
							<div key={groupLabel}>
								{groupLabel && <Label>{groupLabel}</Label>}
								<ul
									className={cn('flex flex-col gap-y-0.5 text-sm', {
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
							title="Go home"
							variant="ghost"
							size="icon"
							className="border border-transparent p-1.5 text-foreground hover:border-edge-subtle/50 hover:bg-sidebar-surface/70"
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
