import { useUserStore } from '@stump/client'
import { Suspense } from 'react'
import { Navigate, Outlet } from 'react-router-dom'

import SettingsNavigation from './SettingsNavigation'

export default function SettingsLayout() {
	const user = useUserStore((store) => store.user)

	if (!user) {
		return <Navigate to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`} />
	}

	return (
		<div className="flex h-full w-full flex-col gap-2">
			<SettingsNavigation user={user} />
			<Suspense>
				<Outlet />
			</Suspense>
		</div>
	)
}
