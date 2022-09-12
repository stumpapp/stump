import { Box, Flex, useColorModeValue } from '@chakra-ui/react';
import { AppPropsContext, useStartUpQuery } from '@stump/client';
import React, { useContext } from 'react';
import { Outlet } from 'react-router-dom';
import Lazy from './components/Lazy';
// import Sidebar from './components/Sidebar/Sidebar';

export function AppLayout() {
	const appProps = useContext(AppPropsContext);

	const { data } = useStartUpQuery();

	return (
		<Flex w="full" h="full">
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
