import { Stack, Text, useColorModeValue } from '@chakra-ui/react';
import React from 'react';

export default function SettingsNav() {
	return (
		<Stack
			display="flex"
			flexShrink={0}
			py={4}
			borderRight="1px"
			borderRightColor={useColorModeValue('gray.200', 'gray.700')}
			shadow="sm"
			w={{ base: 20, md: 48 }}
			h="full"
			px={2}
		>
			<Text>User Preferences</Text>
			<Text>Server Settings</Text>
		</Stack>
	);
}
