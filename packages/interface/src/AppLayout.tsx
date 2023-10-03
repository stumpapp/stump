import { useAppProps, useAuthQuery, useCoreEventHandler, useUserStore } from '@stump/client'
import { Suspense, useMemo } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'

import BackgroundFetchIndicator from './components/BackgroundFetchIndicator'
import JobOverlay from './components/jobs/JobOverlay'
import RouteLoadingIndicator from './components/RouteLoadingIndicator'
import ServerStatusOverlay from './components/ServerStatusOverlay'
import Sidebar from './components/sidebar/Sidebar'
import TopBar from './components/topbar/TopBar'
import { AppContext } from './context'

export function AppLayout() {
	const appProps = useAppProps()

	const navigate = useNavigate()
	const location = useLocation()

	const hideSidebar = useMemo(() => {
		// hide sidebar when reading a book
		return location.pathname.match(/\/book(s?)\/.+\/(.*-?reader)/)
	}, [location])

	useCoreEventHandler()

	const { storeUser, setUser } = useUserStore((state) => ({
		setUser: state.setUser,
		storeUser: state.user,
	}))

	// TODO: platform specific hotkeys
	// TODO: cmd+shift+h for home
	useHotkeys('ctrl+,, cmd+,', (e) => {
		e.preventDefault()
		navigate('/settings/general')
	})

	const { error } = useAuthQuery({
		enabled: !storeUser,
		onSuccess: setUser,
	})

	// TODO: I should def throw error, but something about throwing error causes
	// an async error
	// @ts-expect-error: FIXME: type error no good >:(
	const isNetworkError = error?.code === 'ERR_NETWORK'
	if (isNetworkError) {
		return <Navigate to="/server-connection-error" state={{ from: location }} />
	}

	if (!storeUser) {
		return null
	}

	return (
		<AppContext.Provider
			value={{ isServerOwner: storeUser.role === 'SERVER_OWNER', user: storeUser }}
		>
			<Suspense fallback={<RouteLoadingIndicator />}>
				{!hideSidebar && <TopBar />}
				<div className="flex h-full w-full">
					{!hideSidebar && <Sidebar />}
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
