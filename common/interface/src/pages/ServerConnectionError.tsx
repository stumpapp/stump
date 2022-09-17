import { Alert, AlertIcon, Container, Stack } from '@chakra-ui/react';
import ServerUrlForm from '../components/ServerUrlForm';

export default function ServerConnectionError() {
	return (
		<Stack as={Container} p="4" spacing={4} h="full" justify="center">
			<Alert status="error" rounded="md">
				<AlertIcon />
				{/* {t('loginPage.claimText')} */}
				Darn! We couldn't connect to your configured Stump server. Please check your connection and
				try again. If your server URL has changed, use the form below to update it.
			</Alert>

			<ServerUrlForm />
		</Stack>
	);
}
