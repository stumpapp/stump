import { isAxiosError } from '@stump/api'
import { useAppProps, useAuthQuery, useCoreEventHandler, useUserStore } from '@stump/client'
import { UserPermission, UserPreferences } from '@stump/types'
import { Suspense, useCallback, useMemo } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'

import BackgroundFetchIndicator from '@/components/BackgroundFetchIndicator'
import JobOverlay from '@/components/jobs/JobOverlay'
import RouteLoadingIndicator from '@/components/RouteLoadingIndicator'
import ServerStatusOverlay from '@/components/ServerStatusOverlay'
import { SideBar } from '@/components/sidebar'
import TopBar from '@/components/topbar/TopBar'

import { TopNavigation } from './components/topNavigation'
import { AppContext, PermissionEnforcerOptions } from './context'

export function AppLayout() {
	const appProps = useAppProps()

	const location = useLocation()
	const navigate = useNavigate()

	const { storeUser, setUser, checkUserPermission } = useUserStore((state) => ({
		checkUserPermission: state.checkUserPermission,
		setUser: state.setUser,
		storeUser: state.user,
	}))

	const preferTopBar = useMemo(() => {
		const userPreferences = storeUser?.user_preferences ?? ({} as UserPreferences)
		return userPreferences?.primary_navigation_mode === 'TOPBAR'
	}, [storeUser])

	const softHideSidebar = useMemo(() => {
		const userPreferences = storeUser?.user_preferences ?? ({} as UserPreferences)
		const { enable_double_sidebar, enable_replace_primary_sidebar } = userPreferences

		// hide sidebar when double sidebar is enabled and replace primary sidebar is enabled and on a route where
		// a secondary sidebar is displayed (right now, just settings/*)
		if (enable_double_sidebar && enable_replace_primary_sidebar) {
			return (location.pathname.match(/\/settings\/.+/) ?? []).length > 0
		} else {
			return false
		}
	}, [location, storeUser])

	const hideNavigation = useMemo(
		() => (location.pathname.match(/\/book(s?)\/.+\/(.*-?reader)/) ?? []).length > 0,
		[location],
	)

	const hideSidebar = hideNavigation || preferTopBar
	const hideTopBar = hideNavigation || !preferTopBar

	useCoreEventHandler()

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
				{!hideNavigation && <TopBar />}
				{!hideTopBar && <TopNavigation />}
				<div className="flex h-full w-full">
					{!hideSidebar && <SideBar hidden={softHideSidebar} />}
					<main className="min-h-full w-full bg-background">
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
