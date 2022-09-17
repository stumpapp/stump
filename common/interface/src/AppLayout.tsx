import React, { useMemo } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { Box, Flex, useColorModeValue } from '@chakra-ui/react';
import { useAuthQuery, useJobManager, useUserStore } from '@stump/client';

import Lazy from './components/Lazy';
import Sidebar from './components/sidebar/Sidebar';
import JobOverlay from './components/JobOverlay';
import TopBar from './components/topbar/TopBar';

export function AppLayout() {
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

	const { user, isLoading } = useAuthQuery({
		onSuccess: setUser,
		enabled: !storeUser,
	});

	const hasUser = !!user || !!storeUser;

	if (!hasUser && !isLoading) {
		return <Navigate to="/auth" state={{ from: location }} />;
	}

	return (
		<React.Suspense fallback={<>Loading...</>}>
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
