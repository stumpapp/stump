import React, { useContext } from 'react';
import { Outlet } from 'react-router-dom';

import { Box, Flex, useColorModeValue } from '@chakra-ui/react';
import { AppPropsContext } from '@stump/client';

import Lazy from './components/Lazy';

export function AppLayout() {
	const appProps = useContext(AppPropsContext);

	return (
		<Flex
			w="full"
			h="full"
			onContextMenu={(e) => {
				if (appProps?.platform != 'browser') {
					e.preventDefault();
					return false;
				}

				return true;
			}}
		>
			{/* <Sidebar /> */}
			{/* {!hideSidebar && <Sidebar />} */}
			<Box as="main" w="full" h="full" bg={useColorModeValue('gray.75', 'gray.900')}>
				{/* {!hideSidebar && <Topbar />} */}
				<React.Suspense fallback={<Lazy />}>
					<Outlet />
				</React.Suspense>
			</Box>
		</Flex>
	);
}
