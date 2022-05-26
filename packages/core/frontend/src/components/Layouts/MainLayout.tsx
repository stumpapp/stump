import React, { useMemo } from 'react';
import { useQueries } from 'react-query';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getLibraries } from '~api/query/library';
import { getMedia } from '~api/query/media';
import Lazy from '~components/Lazy';
import Topbar from '~components/Topbar';
import Sidebar from '~components/Sidebar/Sidebar';
import { useStore } from '~store/store';

import { Box, Flex, useColorModeValue } from '@chakra-ui/react';
import { AxiosError } from 'axios';

// FIXME: hook issues, not surprised.
// I believe it is caused becuase of how I navigate to login before some hooks complete?
// not sure.
export default function MainLayout() {
	const navigate = useNavigate();
	const location = useLocation();

	const store = useStore(({ setLibraries, setMedia }) => ({ setLibraries, setMedia }));

	const queries = useQueries([
		{
			queryKey: 'getLibraries',
			queryFn: getLibraries,
			onSuccess: validateGetLibraries,
			onError,
		},
		{ queryKey: 'getMedia', queryFn: getMedia, onSuccess: validateGetMedia, onError },
	]);

	const hideSidebar = useMemo(() => {
		// hide sidebar when on /books/:id/pages/:page
		return location.pathname.match(/\/books\/.+\/pages\/.+/);
	}, [location]);

	const isLoading = useMemo(() => queries.some((query) => query.isLoading), [queries]);

	// const hideTopBar = useMemo(() => {
	// 	// hide topbar when on /books/:id/pages/:page OR /settings
	// 	return location.pathname.match(/\/books\/.+\/pages\/.+|\/settings/);
	// }, [location]);

	function onError(e: any) {
		let err = e as AxiosError;

		const res = err.response;

		if (res?.status === 401) {
			navigate('/auth/login');
		} else {
			throw new Error(`Unknown error: ${err.message}`);
		}
	}

	function validateGetMedia(res?: GetMediaResponse) {
		if (!res || !res.data) throw new Error('Could not get media');

		if (res.status === 200) {
			store.setMedia(res.data);
		}
	}

	function validateGetLibraries(res?: GetLibrariesResponse) {
		if (!res || !res.data) throw new Error('Could not get libraries');

		if (res.status === 200) {
			store.setLibraries(res.data);
		}
	}

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
