import React, { useMemo } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Lazy from '~components/Lazy';
import Topbar from '~components/Topbar';
import Sidebar from '~components/Sidebar/Sidebar';

import { Box, Flex, useColorModeValue } from '@chakra-ui/react';
import client from '~api/client';
import { useUser } from '~hooks/useUser';
import { useLibraries } from '~hooks/useLibraries';

export default function MainLayout() {
	const location = useLocation();

	const _user = useUser();

	const { isLoading, error } = useLibraries();

	const hideSidebar = useMemo(() => {
		// hide sidebar when on /books/:id/pages/:page or /epub/
		// TODO: replace with single regex, I am lazy rn
		return (
			location.pathname.match(/\/books\/.+\/pages\/.+/) || location.pathname.match(/\/epub\/.+/)
		);
	}, [location]);

	if (isLoading) {
		return null;
	} else if (error?.response?.status === 401) {
		client.invalidateQueries(['getLibraries']);
		return <Navigate to="/auth/login" />;
	}

	return (
		<Flex w="full" h="full">
			{!hideSidebar && <Sidebar />}
			<Box as="main" w="full" h="full" bg={useColorModeValue('gray.75', 'gray.900')}>
				{!hideSidebar && <Topbar />}
				<React.Suspense fallback={<Lazy />}>
					<Outlet />
				</React.Suspense>
			</Box>
		</Flex>
	);
}
