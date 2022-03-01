import { Box, useColorModeValue } from '@chakra-ui/react';
import React from 'react';
import { useQueries } from 'react-query';
import { Outlet, useNavigate } from 'react-router-dom';
import { getLibraries } from '~api/query/library';
import { getMedia } from '~api/query/media';
import Lazy from '~components/Lazy';
import Sidebar from '~components/Sidebar';
import { useMainStore } from '~store/mainStore';
import MainStoreProvider from '~store/MainStoreProvider';

function Layout() {
	const store = useMainStore(({ setLibraries, setMedia }) => ({ setLibraries, setMedia }));
	const navigate = useNavigate();

	const _ = useQueries([
		{ queryKey: 'getLibraries', queryFn: getLibraries, onSuccess: validateGetLibraries },
		{ queryKey: 'getMedia', queryFn: getMedia, onSuccess: validateGetMedia },
	]);

	function validateGetMedia(res?: GetMediaResponse) {
		if (!res || !res.data) throw new Error('Could not get media');

		if (res.status === 401) {
			navigate('/login');
		}

		store.setMedia(res.data);
	}

	function validateGetLibraries(res?: GetLibrariesResponse) {
		if (!res || !res.data) throw new Error('Could not get libraries');

		if (res.status === 401) {
			navigate('/login');
		}

		store.setLibraries(res.data);
	}

	return (
		<Sidebar>
			<Box bg={useColorModeValue('gray.100', 'gray.900')} as="main">
				<React.Suspense fallback={<Lazy />}>
					<Outlet />
				</React.Suspense>
			</Box>
		</Sidebar>
	);
}

export default function MainLayout() {
	return (
		<MainStoreProvider>
			<Layout />
		</MainStoreProvider>
	);
}
