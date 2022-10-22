import { Box, useColorModeValue, VStack } from '@chakra-ui/react';
import SettingsNavigation from './SettingsNavigation';
import { Outlet } from 'react-router-dom';

export default function SettingsLayout() {
	return (
		<VStack h="full" w="full">
			<SettingsNavigation />
			<Box w="full" h="full" bg={useColorModeValue('gray.75', 'gray.900')} p="4">
				<Outlet />
			</Box>
		</VStack>
	);
}
