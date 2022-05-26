import React from 'react';
import { Box, Flex, useColorModeValue } from '@chakra-ui/react';
import SettingsNav from '~components/Settings/SettingsNav';
import { Outlet } from 'react-router-dom';

export default function Settings() {
	return (
		<Flex>
			<SettingsNav />
			<Box bg={useColorModeValue('gray.100', 'gray.900')} p="4">
				<Outlet />
			</Box>
		</Flex>
	);
}
