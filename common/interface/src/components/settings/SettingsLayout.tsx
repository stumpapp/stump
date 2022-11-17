import { Box, useColorModeValue, VStack } from '@chakra-ui/react';
import SettingsNavigation from './SettingsNavigation';
import { Outlet } from 'react-router-dom';
import { useUserStore } from '@stump/client';

export default function SettingsLayout() {
	const { user } = useUserStore();

	if (!user) {
		return null;
	}

	return (
		<VStack h="full" w="full">
			<SettingsNavigation user={user} />
			<Box w="full" h="full" bg={useColorModeValue('gray.75', 'gray.900')} p="4">
				<Outlet />
			</Box>
		</VStack>
	);
}
