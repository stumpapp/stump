import { Box, Flex, useColorModeValue } from '@chakra-ui/react'
import { useAppProps, useAuthQuery, useCoreEventHandler, useUserStore } from '@stump/client'
import React, { useMemo } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'

import CommandPalette from './components/CommandPalette'
import JobOverlay from './components/jobs/JobOverlay'
import Lazy from './components/Lazy'
import ServerStatusOverlay from './components/ServerStatusOverlay'
import Sidebar from './components/sidebar/Sidebar'
import TopBar from './components/topbar/TopBar'
import { AppContext } from './context'

export function AppLayout() {
	const appProps = useAppProps()

	const navigate = useNavigate()
	const location = useLocation()

	const hideSidebar = useMemo(() => {
		// hide sidebar when on /books/:id/pages/:page or /epub/
		// TODO: replace with single regex, I am lazy rn
		return (
			location.pathname.match(/\/books\/.+\/pages\/.+/) || location.pathname.match(/\/epub\/.+/)
		)
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

	const mainColor = useColorModeValue('gray.75', 'gray.900')

	// @ts-expect-error: FIXME: type error no good >:(
	if (error?.code === 'ERR_NETWORK' && appProps?.platform !== 'browser') {
		return <Navigate to="/server-connection-error" state={{ from: location }} />
	}

	if (!storeUser) {
		throw new Error('User was not expected to be null')
	}

	return (
		<AppContext.Provider
			value={{ isServerOwner: storeUser.role === 'SERVER_OWNER', user: storeUser }}
		>
			<React.Suspense fallback={<Lazy />}>
				<CommandPalette />
				<Flex
					// className={clsx({ 'overflow-hidden': appProps?.platform !== 'browser' })}
					w="full"
					h="full"
					onContextMenu={() => {
						// TODO: uncomment once I add custom menu on Tauri side
						// if (appProps?.platform != 'browser') {
						// 	e.preventDefault();
						// 	return false;
						// }

						return true
					}}
				>
					{!hideSidebar && <Sidebar />}
					<Box as="main" w="full" h="full" bg={mainColor}>
						{!hideSidebar && <TopBar />}
						<React.Suspense fallback={<Lazy />}>
							<Outlet />
						</React.Suspense>
					</Box>
				</Flex>

				{appProps?.platform !== 'browser' && <ServerStatusOverlay />}
				{!location.pathname.match(/\/settings\/jobs/) && <JobOverlay />}
			</React.Suspense>
		</AppContext.Provider>
	)
}
