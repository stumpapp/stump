import { cn } from '@stump/components'
import { Suspense } from 'react'
import { Navigate, Outlet } from 'react-router'
import { useMediaMatch } from 'rooks'
import { useShallow } from 'zustand/react/shallow'

import { usePreferences } from '@/hooks'
import { useUserStore } from '@/stores'

import SettingsHeader from './SettingsHeader'
import SettingsSideBar from './SettingsSideBar'

export default function SettingsLayout() {
	const isMobile = useMediaMatch('(max-width: 768px)')

	const { user } = useUserStore(
		useShallow((store) => ({
			user: store.user,
		})),
	)
	const {
		preferences: { enableHideScrollbar },
	} = usePreferences()

	if (!user) {
		return <Navigate to={`/auth?redirect=${encodeURIComponent(window.location.pathname)}`} />
	}

	const displaySideBar = !isMobile
	const renderNavigation = isMobile || !displaySideBar

	return (
		<div
			className={cn('md:flex-row flex w-full flex-1 flex-col', {
				'scrollbar-hide': enableHideScrollbar,
			})}
		>
			<div className="md:flex-row flex w-full flex-col">
				{displaySideBar && <SettingsSideBar />}
				<div className="min-w-0 w-full flex-1 flex-col">
					<SettingsHeader renderNavigation={renderNavigation} />
					<Suspense fallback={null}>
						<Outlet />
					</Suspense>
				</div>
			</div>
		</div>
	)
}
