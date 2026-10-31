import { useAuthQuery, useSDK } from '@stump/client'
import { cn } from '@stump/components'
import { UserPermission, UserPreferences } from '@stump/graphql'
import { isAxiosError } from '@stump/sdk'
import { useQueryClient } from '@tanstack/react-query'
import { useOverlayScrollbars } from 'overlayscrollbars-react'
import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react'
import Confetti from 'react-confetti'
import { useErrorBoundary } from 'react-error-boundary'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { useWindowSize } from 'rooks'
import { toast } from 'sonner'

import BackgroundFetchIndicator from '@/components/BackgroundFetchIndicator'
import JobOverlay from '@/components/jobs/JobOverlay'
import { AppSidebar, Sidebar } from '@/components/navigation/sidebar'
import RouteLoadingIndicator from '@/components/RouteLoadingIndicator'

import { AppContext, PermissionEnforcerOptions } from './context'
import { useTheme } from './hooks'
import { useCoreEvent } from './hooks/useCoreEvent'
import { useAppStore, useUserStore } from './stores'

export function AppLayout() {
	const location = useLocation()
	const navigate = useNavigate()

	const mainRef = useRef<HTMLDivElement>(null)
	const windowSize = useWindowSize()

	const { showBoundary } = useErrorBoundary()

	const { sdk } = useSDK()

	const showConfetti = useAppStore((state) => state.showConfetti)
	const setShowConfetti = useAppStore((state) => state.setShowConfetti)
	const onConnectionWithServerChanged = useAppStore((state) => state.setIsConnectedWithServer)

	const storeUser = useUserStore((state) => state.user)
	const checkUserPermission = useUserStore((state) => state.checkUserPermission)
	const setUser = useUserStore((state) => state.setUser)

	const { isDarkVariant, shouldUseGradient } = useTheme()
	const [initialize, instance] = useOverlayScrollbars({
		options: {
			scrollbars: {
				theme: isDarkVariant ? 'os-theme-light' : 'os-theme-dark',
			},
		},
	})

	const hideScrollBar = storeUser?.preferences?.enableHideScrollbar ?? false
	const jobOverlayEnabled = storeUser?.preferences?.enableJobOverlay ?? true
	const showJobOverlay = jobOverlayEnabled && !location.pathname.match(/\/settings\/jobs/)

	// eslint-disable-next-line react-hooks/refs
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
	 * some ui components require knowing the height of the main content to position
	 * itself correctly, like settings sidebars, and so this observer will
	 * set a css var accordingly
	 */
	const mainHeightObserver = useRef<ResizeObserver | null>(null)
	const setMainRef = useCallback((node: HTMLDivElement | null) => {
		mainRef.current = node

		mainHeightObserver.current?.disconnect()
		mainHeightObserver.current = null
		if (!node) return

		const observer = new ResizeObserver(() => {
			node.style.setProperty('--main-height', `${node.clientHeight}px`)
		})
		observer.observe(node)
		mainHeightObserver.current = observer
	}, [])
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
	 * If enabled, the client will refetch certain queries to hydrate the UI with
	 * new data. Otherwise, the client will wait for the job output before deciding
	 * what data to refetch.
	 */
	const liveRefetch = useMemo(
		() => (storeUser?.preferences ?? ({} as UserPreferences)).enableLiveRefetch || false,
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

	useCoreEvent({ liveRefetch, onConnectionWithServerChanged })

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

	const { error, user } = useAuthQuery({
		enabled: !storeUser,
	})

	const client = useQueryClient()
	const logout = useCallback(async () => {
		try {
			await sdk.auth.logout()
			client.clear()
			setUser(null)
			navigate('/auth')
			toast.success('You have been logged out')
		} catch (error) {
			console.error('Error logging out:', { error })
			toast.error('There was an error logging you out. Please try again.')
		}
	}, [sdk, client, setUser, navigate])

	useEffect(() => {
		if (user) {
			setUser(user)
		}
	}, [user, setUser])

	// FIXME(desktop): There is a bug somewhere here that causes a network error to be thrown before the auth takes effect.
	// It happens intermittently, annoyingly. I'm not sure what's causing it, but it would be nice to fix it
	useEffect(() => {
		const axiosError = isAxiosError(error) ? error : null
		const isUnauthorized = axiosError?.response?.status === 401
		const isNetworkError = axiosError?.code === 'ERR_NETWORK'

		if (isNetworkError || isUnauthorized) {
			const to = isNetworkError
				? '/server-connection-error'
				: `/auth?redirect=${encodeURIComponent(location.pathname)}`
			navigate(to)
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
				isServerOwner: storeUser.isServerOwner,
				user: storeUser,
				logout,
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
				<Sidebar.Provider>
					<Suspense fallback={null}>{!hideAllNavigation && <AppSidebar />}</Suspense>
					<Sidebar.Inset
						id="main"
						className={cn(
							'min-h-0 overflow-x-hidden overflow-y-auto',
							{
								'scrollbar-hide': storeUser.preferences?.enableHideScrollbar,
							},
							{
								'bg-linear-to-br from-background-gradient-from to-background-gradient-to':
									shouldUseGradient,
							},
						)}
						ref={setMainRef}
					>
						<div className="relative flex flex-1 flex-col">
							{!!storeUser.preferences?.showQueryIndicator && <BackgroundFetchIndicator />}
							<Suspense fallback={<RouteLoadingIndicator />}>
								<Outlet />
							</Suspense>
						</div>
					</Sidebar.Inset>
				</Sidebar.Provider>

				{showJobOverlay && <JobOverlay />}
			</Suspense>
		</AppContext.Provider>
	)
}
