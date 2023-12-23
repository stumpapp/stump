import { isAxiosError } from '@stump/api'
import { useAppProps, useAuthQuery, useCoreEventHandler, useUserStore } from '@stump/client'
import { UserPermission } from '@stump/types'
import { Suspense, useCallback, useMemo } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'

import BackgroundFetchIndicator from '@/components/BackgroundFetchIndicator'
import JobOverlay from '@/components/jobs/JobOverlay'
import RouteLoadingIndicator from '@/components/RouteLoadingIndicator'
import ServerStatusOverlay from '@/components/ServerStatusOverlay'
import { SideBar } from '@/components/sidebar'
import TopBar from '@/components/topbar/TopBar'

import { AppContext, PermissionEnforcerOptions } from './context'

export function AppLayout() {
	const appProps = useAppProps()

	const location = useLocation()
	const navigate = useNavigate()

	const hideSidebar = useMemo(() => {
		// hide sidebar when reading a book
		return location.pathname.match(/\/book(s?)\/.+\/(.*-?reader)/)
	}, [location])

	useCoreEventHandler()

	const { storeUser, setUser, checkUserPermission } = useUserStore((state) => ({
		checkUserPermission: state.checkUserPermission,
		setUser: state.setUser,
		storeUser: state.user,
	}))

	const enforcePermission = useCallback(
		(
			permission: UserPermission,
			{ onFailure }: PermissionEnforcerOptions = {
				onFailure: () => navigate('..'),
			},
		) => {
			if (!checkUserPermission(permission)) {
				onFailure()
			}
		},
		[checkUserPermission, navigate],
	)

	// TODO: platform specific hotkeys

	const { error } = useAuthQuery({
		enabled: !storeUser,
		onSuccess: setUser,
	})

	const axiosError = isAxiosError(error) ? error : null
	const isNetworkError = axiosError?.code === 'ERR_NETWORK'
	if (isNetworkError) {
		return <Navigate to="/server-connection-error" state={{ from: location }} />
	} else if (error && !storeUser) {
		throw error
	}

	if (!storeUser) {
		return null
	}

	return (
		<AppContext.Provider
			value={{
				checkPermission: checkUserPermission,
				enforcePermission,
				isServerOwner: storeUser.is_server_owner,
				user: storeUser,
			}}
		>
			<Suspense fallback={<RouteLoadingIndicator />}>
				{!hideSidebar && <TopBar />}
				<div className="flex h-full w-full">
					{!hideSidebar && <SideBar />}
					<main className="min-h-full w-full bg-white dark:bg-gray-975">
						{!!storeUser.user_preferences?.show_query_indicator && <BackgroundFetchIndicator />}
						<Suspense fallback={<RouteLoadingIndicator />}>
							<Outlet />
						</Suspense>
					</main>
				</div>

				{appProps?.platform !== 'browser' && <ServerStatusOverlay />}
				{!location.pathname.match(/\/settings\/jobs/) && <JobOverlay />}
			</Suspense>
		</AppContext.Provider>
	)
}
