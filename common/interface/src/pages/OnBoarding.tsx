import { Alert, AlertIcon, Container, HStack, Stack, Text } from '@chakra-ui/react';

import ServerUrlForm from '../components/ServerUrlForm';

// Used primarily for setting the correct base url for the api when the app is
// NOT running in a browser. I.e. when the app is running in Tauri.
// TODO: locale!
export default function OnBoarding() {
	return (
		<Stack as={Container} p="4" spacing={4} h="full" justify="center">
			<HStack px={2} flexShrink={0} justifyContent="center" alignItems="center" spacing="4">
				<img src="/favicon.png" width="120" height="120" />
				<Text
					bgGradient="linear(to-r, brand.600, brand.200)"
					bgClip="text"
					fontSize="4xl"
					fontWeight="bold"
				>
					Stump
				</Text>
			</HStack>
			<Alert status="info" rounded="md">
				<AlertIcon />
				{/* {t('loginPage.claimText')} */}
				Welcome to Stump! To get started, please enter the base URL of your Stump server below.
			</Alert>

			<ServerUrlForm />
		</Stack>
	);
}
