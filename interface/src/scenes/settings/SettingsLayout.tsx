import { useUserStore } from '@stump/client'
import { Suspense } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useMediaMatch } from 'rooks'

import SettingsHeader from './SettingsHeader'
// import SettingsNavigation from './SettingsNavigation'
import SettingsSideBar from './SettingsSideBar'

export default function SettingsLayout() {
	const user = useUserStore((store) => store.user)
	const isMobile = useMediaMatch('(max-width: 768px)')

	if (!user) {
		return <Navigate to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`} />
	}

	const displaySideBar = /*userPreferences.enable_double_sidebar && */ !isMobile

	return (
		<div className="flex h-full w-full flex-col md:flex-row">
			{displaySideBar && <SettingsSideBar />}
			<div className="w-full max-w-4xl flex-1 flex-col overflow-y-auto">
				<SettingsHeader renderNavigation={!displaySideBar} />
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
	return <div className="mt-6 flex flex-col gap-8 md:gap-12">{children}</div>
}
