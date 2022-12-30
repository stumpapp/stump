import { Heading, Stack, StackProps, Text, useColorModeValue, VStack } from '@chakra-ui/react';
import React from 'react';

export type SettingsSectionProps = {
	title: string;
	subtitle: string;
	children: React.ReactNode;
} & StackProps;

export default function SettingsSection({
	title,
	subtitle,
	children,
	...props
}: SettingsSectionProps) {
	return (
		<Stack spacing={4} px={2} {...props}>
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
