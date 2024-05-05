import { isAxiosError } from '@stump/api'
import { useAuthQuery, useCoreEventHandler } from '@stump/client'
import { cn, cx } from '@stump/components'
import { UserPermission, UserPreferences } from '@stump/types'
import { Suspense, useCallback, useMemo } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMediaMatch } from 'rooks'

import BackgroundFetchIndicator from '@/components/BackgroundFetchIndicator'
import JobOverlay from '@/components/jobs/JobOverlay'
import { MobileTopBar, SideBar, TopBar } from '@/components/navigation'
import RouteLoadingIndicator from '@/components/RouteLoadingIndicator'
import ServerStatusOverlay from '@/components/ServerStatusOverlay'

import { AppContext, PermissionEnforcerOptions } from './context'
import { useAppStore, useUserStore } from './stores'

export function AppLayout() {
	const platform = useAppStore((state) => state.platform)
	const location = useLocation()
	const navigate = useNavigate()
	const isMobile = useMediaMatch('(max-width: 768px)')

	const { storeUser, setUser, checkUserPermission } = useUserStore((state) => ({
		checkUserPermission: state.checkUserPermission,
		setUser: state.setUser,
		storeUser: state.user,
	}))

	/**
	 * If the user prefers the top bar, we hide the sidebar
	 */
	const preferTopBar = useMemo(() => {
		const userPreferences = storeUser?.user_preferences ?? ({} as UserPreferences)
		return userPreferences?.primary_navigation_mode === 'TOPBAR'
	}, [storeUser])

	/**
	 * Soft hiding the sidebar allows a nice animation when toggling the sidebar
	 * stacking preference
	 */
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

	/**
	 * If enabled, the client will refetch certain queries to hydrate the UI with
	 * new data. Otherwise, the client will wait for the job output before deciding
	 * what data to refetch.
	 */
	const liveRefetch = useMemo(
		() => (storeUser?.user_preferences ?? ({} as UserPreferences)).enable_live_refetch || false,
		[storeUser],
	)

	/**
	 * Whenever we are in a Stump reader, we remove all navigation elements from
	 * the DOM
	 */
	const hideAllNavigation = useMemo(
		() => (location.pathname.match(/\/book(s?)\/.+\/(.*-?reader)/) ?? []).length > 0,
		[location],
	)

	const hideSidebar = hideAllNavigation || preferTopBar
	const hideTopBar = isMobile || hideAllNavigation || !preferTopBar

	useCoreEventHandler({ liveRefetch })

	/**
	 * A callback to enforce a permission on the currently logged in user.
	 */
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

	// TODO: platform specific hotkeys?

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
				{!hideAllNavigation && <MobileTopBar />}
				{!hideTopBar && <TopBar />}
				<div className={cx('flex h-full flex-1', { 'pb-12': preferTopBar && !hideTopBar })}>
					<Suspense fallback={null}>
						{!hideSidebar && <SideBar hidden={softHideSidebar} />}
					</Suspense>
					<main
						id="main"
						className={cn(
							'flex w-full flex-1 flex-col overflow-y-auto overflow-x-hidden bg-background',
							{
								'scrollbar-hide': storeUser.user_preferences?.enable_hide_scrollbar,
							},
						)}
					>
						<div className="relative flex flex-1 flex-col">
							{!!storeUser.user_preferences?.show_query_indicator && <BackgroundFetchIndicator />}
							<Suspense fallback={<RouteLoadingIndicator />}>
								<Outlet />
							</Suspense>
						</div>
					</main>
				</div>

				{platform !== 'browser' && <ServerStatusOverlay />}
				{!location.pathname.match(/\/settings\/jobs/) && <JobOverlay />}
			</Suspense>
		</AppContext.Provider>
	)
}
