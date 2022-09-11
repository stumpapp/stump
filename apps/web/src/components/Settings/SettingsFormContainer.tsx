import { Heading, Stack, Text, useColorModeValue, VStack } from '@chakra-ui/react';
import React from 'react';

export interface SettingsFormContainerProps {
	title: string;
	subtitle: string;
	children: React.ReactNode;
}

export default function SettingsFormContainer({
	title,
	subtitle,
	children,
}: SettingsFormContainerProps) {
	return (
		<Stack spacing={4} px={2}>
			<VStack spacing={1}>
				<Heading alignSelf="start" size="md">
					{title}
				</Heading>
				<Text alignSelf="start" size="sm" color={useColorModeValue('gray.700', 'gray.400')}>
					{subtitle}
				</Text>
			</VStack>

			{children}
		</Stack>
	);
}
