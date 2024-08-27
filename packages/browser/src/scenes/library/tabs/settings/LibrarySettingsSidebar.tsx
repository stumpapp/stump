import { Button, ButtonOrLink, cn, IconButton, Label } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { ArrowLeft, Home } from 'lucide-react'
import React from 'react'
import { useLocation, useNavigate } from 'react-router'

import { usePreferences } from '@/hooks/usePreferences'
import paths from '@/paths'
import { SideBarLinkButton } from '@/scenes/settings'
import { useAppStore } from '@/stores'

import { useLibraryContext } from '../../context'
import { formatLabel, useLibrarySettingsRoutes } from './useLibrarySettingsRoutes'

export default function LibrarySettingsSidebar() {
	const location = useLocation()
	const navigate = useNavigate()

	const { library } = useLibraryContext()
	const { t } = useLocaleContext()
	const platform = useAppStore((store) => store.platform)
	const {
		preferences: { enable_replace_primary_sidebar, primary_navigation_mode },
	} = usePreferences()

	const { groups } = useLibrarySettingsRoutes()

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
				<div className="flex items-center space-x-2">
					<ButtonOrLink
						href={paths.libraryBooks(library.id)}
						variant="ghost"
						className="h-[unset] w-[unset] shrink-0 border border-transparent p-1 text-foreground hover:border-edge-subtle/50 hover:bg-sidebar-surface/70"
						size="sm"
					>
						<ArrowLeft className="h-4 w-4 transform" />
					</ButtonOrLink>

					{/* TODO: handle wrapping... */}
					<Label className="line-clamp-1 py-1">{library.name}</Label>
				</div>

				{groups
					.map(({ label, items }) => {
						const groupLabel = label ? t(`librarySettingsScene.${formatLabel(label)}.label`) : ''

						const withGroup = (key: string) =>
							label
								? t(`librarySettingsScene.sidebar.${formatLabel(label)}.${formatLabel(key)}`)
								: t(`librarySettingsScene.sidebar.${formatLabel(key)}`)
						// librarySettingsScene.sidebar.danger zone.access control
						return (
							<div key={groupLabel}>
								{groupLabel && <Label>{groupLabel}</Label>}
								<ul
									className={cn('flex flex-col gap-y-0.5 text-sm', {
										'pt-2': groupLabel,
									})}
								>
									{items.map(({ to, icon, label, disabled }) => {
										const isDisabled =
											disabled || (platform === 'browser' && to.includes('desktop'))

										return (
											<SideBarLinkButton
												key={to}
												to={to}
												isActive={location.pathname.includes(to)}
												isDisabled={isDisabled}
												icon={icon}
											>
												{/* {t(withGroup(label.toLowerCase()))} */}
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
