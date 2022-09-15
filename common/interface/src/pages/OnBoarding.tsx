import { FieldValues, useForm } from 'react-hook-form';
import { useDebounce } from 'rooks';
import { z } from 'zod';

import {
	Alert,
	AlertIcon,
	Container,
	FormLabel,
	HStack,
	InputGroup,
	InputRightElement,
	Stack,
	Text,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useStumpConfigStore } from '@stump/client';
import { checkUrl, isUrl } from '@stump/client/api';

import Form, { FormControl } from '../ui/Form';
import Input from '../ui/Input';

// Used primarily for setting the correct base url for the api when the app is
// NOT running in a browser. I.e. when the app is running in Tauri.
// TODO: locale!
export default function OnBoarding() {
	const { setBaseUrl } = useStumpConfigStore();

	async function validateUrl(url: string) {
		if (!isUrl(url)) {
			form.setError('baseUrl', {
				message: 'Invalid URL',
			});

			return;
		}

		const isValid = await checkUrl(url);

		if (!isValid) {
			form.setError('baseUrl', {
				message: `Failed to connect to ${url}`,
			});
		}
	}

	const schema = z.object({
		baseUrl: z.string().refine(isUrl, { message: 'Please enter a valid URL' }),
	});

	const form = useForm({
		resolver: zodResolver(schema),
	});

	const debouncedValidate = useDebounce(async (e: any) => {
		return await validateUrl(form.getValues('baseUrl'));
	}, 500);

	function handleSubmit(values: FieldValues) {
		const { baseUrl } = values;

		setBaseUrl(baseUrl);
	}

	if (form.formState.errors && Object.keys(form.formState.errors).length) {
		console.log('errors', form.formState.errors);
	}

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
			<Form onSubmit={handleSubmit} form={form}>
				<FormControl label="Server URL">
					<FormLabel htmlFor="baseUrl">Server URL</FormLabel>

					<InputGroup>
						<Input {...form.register('baseUrl')} onChange={debouncedValidate} />
						<InputRightElement children={<></>} />
					</InputGroup>
				</FormControl>
				{/* <ServerURLInput /> */}
			</Form>
		</Stack>
	);
}
