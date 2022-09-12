import React, { useContext, useMemo } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { Box, Flex, useColorModeValue } from '@chakra-ui/react';
import { AppPropsContext, useAuthQuery, useUserStore } from '@stump/client';

import Lazy from './components/Lazy';
import Sidebar from './components/sidebar/Sidebar';
// import clsx from 'clsx';

export function AppLayout() {
	// const appProps = useContext(AppPropsContext);

	const { setUser } = useUserStore();

	const { user, isLoading } = useAuthQuery({
		onSuccess: setUser,
	});

	const location = useLocation();

	const hideSidebar = useMemo(() => {
		// hide sidebar when on /books/:id/pages/:page or /epub/
		// TODO: replace with single regex, I am lazy rn
		return (
			location.pathname.match(/\/books\/.+\/pages\/.+/) || location.pathname.match(/\/epub\/.+/)
		);
	}, [location]);

	// const { data: user, isLoading } = useAuthQuery({
	// onSuccess: setUser,
	// });

	// if (isLoading) {
	// 	return null;
	// }

	if (!user) {
		return <Navigate to="/auth" state={{ from: location }} />;
	}

	return (
		<React.Suspense fallback={<>Loading...</>}>
			<Flex
				// className={clsx({ 'overflow-hidden': appProps?.platform !== 'browser' })}
				w="full"
				h="full"
				onContextMenu={(e) => {
					// if (appProps?.platform != 'browser') {
					// 	e.preventDefault();
					// 	return false;
					// }

					return true;
				}}
			>
				{!hideSidebar && <Sidebar />}
				<Box as="main" w="full" h="full" bg={useColorModeValue('gray.75', 'gray.900')}>
					{/* {!hideSidebar && <Topbar />} */}
					<React.Suspense fallback={<Lazy />}>
						<Outlet />
					</React.Suspense>
				</Box>
			</Flex>
		</React.Suspense>
	);
}
