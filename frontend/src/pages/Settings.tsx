import { Box, Flex, useColorModeValue } from '@chakra-ui/react';
import React from 'react';
import BaseLayout from '~components/Layouts/BaseLayout';
import SettingsNav from '~components/Settings/SettingsNav';

export default function Settings() {
	return (
		<Flex h="full">
			{/* <Sidebar /> */}
			<SettingsNav />
			<Box bg={useColorModeValue('gray.100', 'gray.900')} p="4">
				f
			</Box>
		</Flex>
	);
}
