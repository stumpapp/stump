import React from 'react';
import { useQueries } from 'react-query';
import { Outlet, useNavigate } from 'react-router-dom';
import { getLibraries } from '~api/query/library';
import { getMedia } from '~api/query/media';
import Lazy from '~components/Lazy';
import Sidebar from '~components/Sidebar';
import { useStore } from '~store/store';

import { Box, Flex, useColorModeValue } from '@chakra-ui/react';

export default function MainLayout() {
	const store = useStore(({ setLibraries, setMedia }) => ({ setLibraries, setMedia }));
	const navigate = useNavigate();

	const _ = useQueries([
		{
			queryKey: 'getLibraries',
			queryFn: getLibraries,
			onSuccess: validateGetLibraries,
			onError,
		},
		{ queryKey: 'getMedia', queryFn: getMedia, onSuccess: validateGetMedia, onError },
	]);

	function onError(err: any) {
		const res = err.response;

		if (res.status === 401) {
			navigate('/auth/login');
		} else {
			throw new Error(res.data);
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

	return (
		<Flex>
			<Sidebar />
			<Box as="main" bg={useColorModeValue('gray.100', 'gray.900')} p="4">
				<React.Suspense fallback={<Lazy />}>
					<Outlet />
				</React.Suspense>
			</Box>
		</Flex>
	);
}
