import React, { useMemo } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { Box, Flex, useColorModeValue } from '@chakra-ui/react';
import { useAppProps, useAuthQuery, useJobManager, useUserStore } from '@stump/client';

import Lazy from './components/Lazy';
import Sidebar from './components/sidebar/Sidebar';
import JobOverlay from './components/JobOverlay';
import TopBar from './components/topbar/TopBar';
import CommandPalette from './components/CommandPalette';
import { useHotkeys } from 'react-hotkeys-hook';

export function AppLayout() {
	const appProps = useAppProps();

	const navigate = useNavigate();
	const location = useLocation();
	const hideSidebar = useMemo(() => {
		// hide sidebar when on /books/:id/pages/:page or /epub/
		// TODO: replace with single regex, I am lazy rn
		return (
			location.pathname.match(/\/books\/.+\/pages\/.+/) || location.pathname.match(/\/epub\/.+/)
		);
	}, [location]);

	useJobManager();

	const { user: storeUser, setUser } = useUserStore();

	// TODO: platform specific hotkeys
	// TODO: cmd+shift+h for home
	useHotkeys('ctrl+,, cmd+,', (e) => {
		e.preventDefault();
		navigate('/settings/general');
	});

	// TODO: This logic needs to be moved, pretty much every request in Stump should have this
	// functionality. I have no idea how to do this in a clean way right now though.
	// On network error, if on desktop app, navigate to a screen to troubleshoot
	// the connection to the server
	const { user, isLoading, error } = useAuthQuery({
		onSuccess: setUser,
		enabled: !storeUser,
	});

	// @ts-ignore: FIXME: type error no good >:(
	if (error?.code === 'ERR_NETWORK' && appProps?.platform !== 'browser') {
		return <Navigate to="/server-connection-error" state={{ from: location }} />;
	}

	const hasUser = !!user || !!storeUser;

	if (!hasUser && !isLoading) {
		return <Navigate to="/auth" state={{ from: location }} />;
	}

	return (
		<React.Suspense fallback={<>Loading...</>}>
			<CommandPalette />
			<Flex
				// className={clsx({ 'overflow-hidden': appProps?.platform !== 'browser' })}
				w="full"
				h="full"
				onContextMenu={(e) => {
					// TODO: uncomment once I add custom menu on Tauri side
					// if (appProps?.platform != 'browser') {
					// 	e.preventDefault();
					// 	return false;
					// }

					return true;
				}}
			>
				{!hideSidebar && <Sidebar />}
				<Box as="main" w="full" h="full" bg={useColorModeValue('gray.75', 'gray.900')}>
					{!hideSidebar && <TopBar />}
					<React.Suspense fallback={<Lazy />}>
						<Outlet />
					</React.Suspense>
				</Box>
			</Flex>

			<JobOverlay />
		</React.Suspense>
	);
}
