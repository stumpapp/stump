import { usePreferences, useUserStore } from '@stump/client'
import { cx } from '@stump/components'
import { Suspense } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useMediaMatch } from 'rooks'

import SettingsHeader from './SettingsHeader'
import SettingsSideBar from './SettingsSideBar'

export default function SettingsLayout() {
	const { user, userPreferences } = useUserStore((store) => ({
		user: store.user,
		userPreferences: store.userPreferences,
	}))
	const isMobile = useMediaMatch('(max-width: 768px)')

	if (!user) {
		return <Navigate to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`} />
	}

	const displaySideBar = !!userPreferences?.enable_double_sidebar && !isMobile
	const preferTopBar = userPreferences?.primary_navigation_mode === 'TOPBAR'
	const padLeft = displaySideBar && preferTopBar

	// 1. if we are on mobile, we always render it
	// 2. if not displaySideBar, we always render it
	// 3. if topbar, never render it
	const renderNavigation = isMobile || (!displaySideBar && !preferTopBar)

	return (
		<div className="flex h-full w-full flex-col md:flex-row">
			{displaySideBar && <SettingsSideBar />}
			<div
				className={cx('w-full flex-1 flex-col overflow-y-auto', {
					'pl-48': padLeft,
				})}
			>
				<SettingsHeader renderNavigation={renderNavigation} />
				<Suspense fallback={null}>
					<Outlet />
				</Suspense>
			</div>
		</div>
	)
}

type SettingsContentProps = {
	children: React.ReactNode
}

export function SettingsContent({ children }: SettingsContentProps) {
	const {
		preferences: { primary_navigation_mode },
	} = usePreferences()

	return (
		<div
			className={cx('mt-6 flex flex-col gap-8 md:gap-12', {
				'max-w-4xl': primary_navigation_mode === 'SIDEBAR',
			})}
		>
			{children}
		</div>
	)
}
