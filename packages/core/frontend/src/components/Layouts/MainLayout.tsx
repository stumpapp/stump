import React, { useMemo } from 'react';
import { useQuery } from 'react-query';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getLibraries } from '~api/query/library';
import Lazy from '~components/Lazy';
import Topbar from '~components/Topbar';
import Sidebar from '~components/Sidebar/Sidebar';
import { useStore } from '~store/store';

import { Box, Flex, useColorModeValue } from '@chakra-ui/react';
import { AxiosError } from 'axios';

export default function MainLayout() {
	const navigate = useNavigate();
	const location = useLocation();

	const setLibraries = useStore((state) => state.setLibraries);

	const { isLoading } = useQuery('getLibraries', getLibraries, {
		onSuccess(res) {
			setLibraries(res.data);
		},
		onError(err: AxiosError) {
			if (err.response?.status === 401) {
				navigate('/auth/login');
			} else {
				throw new Error(err.message);
			}
		},
	});

	const hideSidebar = useMemo(() => {
		// hide sidebar when on /books/:id/pages/:page
		return location.pathname.match(/\/books\/.+\/pages\/.+/);
	}, [location]);

	if (isLoading) {
		return null;
	}

	return (
		<Flex>
			{!hideSidebar && <Sidebar />}
			<Box as="main" bg={useColorModeValue('gray.100', 'gray.900')}>
				{!hideSidebar && <Topbar />}
				<React.Suspense fallback={<Lazy />}>
					<Outlet />
				</React.Suspense>
			</Box>
		</Flex>
	);
}
