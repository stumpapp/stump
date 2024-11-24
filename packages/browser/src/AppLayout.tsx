import { useAuthQuery, useCoreEventHandler } from '@stump/client'
import { cn, cx } from '@stump/components'
import { isAxiosError } from '@stump/sdk'
import { UserPermission, UserPreferences } from '@stump/sdk'
import { useOverlayScrollbars } from 'overlayscrollbars-react'
import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react'
import Confetti from 'react-confetti'
import { useErrorBoundary } from 'react-error-boundary'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMediaMatch, useWindowSize } from 'rooks'

import BackgroundFetchIndicator from '@/components/BackgroundFetchIndicator'
import JobOverlay from '@/components/jobs/JobOverlay'
import { MobileTopBar, SideBar, TopBar } from '@/components/navigation'
import RouteLoadingIndicator from '@/components/RouteLoadingIndicator'

import { AppContext, PermissionEnforcerOptions } from './context'
import { useTheme } from './hooks'
import { useAppStore, useUserStore } from './stores'

export function AppLayout() {
	const location = useLocation()
	const navigate = useNavigate()

	const mainRef = useRef<HTMLDivElement>(null)
	const isMobile = useMediaMatch('(max-width: 768px)')
	const windowSize = useWindowSize()

	const { showBoundary } = useErrorBoundary()

	const { showConfetti, setShowConfetti, onConnectionWithServerChanged } = useAppStore((state) => ({
		onConnectionWithServerChanged: state.setIsConnectedWithServer,
		platform: state.platform,
		setShowConfetti: state.setShowConfetti,
		showConfetti: state.showConfetti,
	}))
	const { storeUser, setUser, checkUserPermission } = useUserStore((state) => ({
		checkUserPermission: state.checkUserPermission,
		setUser: state.setUser,
		storeUser: state.user,
	}))

	const { isDarkVariant, shouldUseGradient } = useTheme()
	const [initialize, instance] = useOverlayScrollbars({
		options: {
			scrollbars: {
				theme: isDarkVariant ? 'os-theme-light' : 'os-theme-dark',
			},
		},
	})

	const hideScrollBar = storeUser?.user_preferences?.enable_hide_scrollbar ?? false
	const isRefSet = !!mainRef.current
	/**
	 * An effect to initialize the overlay scrollbars
	 */
	useEffect(() => {
		// TODO: make this only on desktop? or a setting for 'pretty' scrollbars
		const { current: scrollContainer } = mainRef
		if (scrollContainer && !hideScrollBar) {
			initialize(scrollContainer)
		}
	}, [initialize, isRefSet, hideScrollBar])
	/**
	 * An effect to find the added viewport element and add the necessary flexbox classes
	 * in order to not break the layout of children elements. This is because overlayscrollbars
	 * will append a new element to the DOM to handle the scrolling
	 */
	useEffect(() => {
		const viewport = instance()?.elements().viewport
		if (!viewport) {
			return
		}

		const requiredClasses = 'relative flex flex-1 flex-col'.split(' ')
		const missingClasses = requiredClasses.filter((c) => !viewport.classList.contains(c))
		if (missingClasses.length) {
			viewport.classList.add(...missingClasses)
		}
		viewport.dataset.artificialScroll = 'true'
	}, [instance, isRefSet])
	/**
	 * An effect to destroy the overlay scrollbars instance when it exists but hideScrollBar is true
	 */
	useEffect(() => {
		const instantiatedInstance = instance()
		if (hideScrollBar && instantiatedInstance) {
			instantiatedInstance.destroy()
		}
	}, [instance, isRefSet, hideScrollBar])

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

	useCoreEventHandler({ liveRefetch, onConnectionWithServerChanged })

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

	// FIXME(desktop): There is a bug somewhere here that causes a network error to be thrown before the auth takes effect.
	// It happens intermittently, annoyingly. I'm not sure what's causing it, but it would be nice to fix it
	useEffect(() => {
		const axiosError = isAxiosError(error) ? error : null
		const isUnauthorized = axiosError?.response?.status === 401
		const isNetworkError = axiosError?.code === 'ERR_NETWORK'

		if (isNetworkError || isUnauthorized) {
			const to = isNetworkError ? '/server-connection-error' : '/auth'
			navigate(to, { state: { from: location } })
		} else if (error) {
			console.error('An unknown error occurred:', error)
			showBoundary(error)
		}
	}, [error, showBoundary, location, navigate])

	if (!storeUser || error) {
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
				{showConfetti && (
					<Confetti
						height={windowSize.innerHeight || undefined}
						width={windowSize.innerWidth || undefined}
						onConfettiComplete={() => setShowConfetti(false)}
						style={{
							zIndex: 1000,
						}}
					/>
				)}
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
							{
								'bg-gradient-to-br from-background-gradient-from to-background-gradient-to':
									shouldUseGradient,
							},
						)}
						ref={mainRef}
					>
						<div className="relative flex flex-1 flex-col">
							{!!storeUser.user_preferences?.show_query_indicator && <BackgroundFetchIndicator />}
							<Suspense fallback={<RouteLoadingIndicator />}>
								<Outlet />
							</Suspense>
						</div>
					</main>
				</div>

				{/* {platform !== 'browser' && <ServerStatusOverlay />} */}
				{!location.pathname.match(/\/settings\/jobs/) && <JobOverlay />}
			</Suspense>
		</AppContext.Provider>
	)
}
