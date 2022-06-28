import React from 'react';
import { Box, Flex, useColorModeValue, VStack } from '@chakra-ui/react';
import SettingsNav from '~components/Settings/SettingsNav';
import { Outlet } from 'react-router-dom';

export default function Settings() {
	return (
		<VStack h="full" w="full">
			<SettingsNav />
			<Box w="full" h="full" bg={useColorModeValue('gray.100', 'gray.900')} p="4">
				<Outlet />
			</Box>
		</VStack>
	);
}
