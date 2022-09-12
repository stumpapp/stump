import { Heading, InputGroup, InputRightElement } from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { checkUrl, isUrl, useStumpConfigStore } from '@stump/client';
import { FieldValues, useForm } from 'react-hook-form';
import { useDebounce } from 'rooks';
import { z } from 'zod';
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
		console.log('submit values:', values);

		const { baseUrl } = values;

		setBaseUrl(baseUrl);
	}

	if (form.formState.errors && Object.keys(form.formState.errors).length) {
		console.log('errors', form.formState.errors);
	}

	return (
		<div>
			<Heading>Enter baseUrl:</Heading>
			<Form onSubmit={handleSubmit} form={form}>
				<FormControl label="Server URL">
					<InputGroup>
						<Input {...form.register('baseUrl')} onChange={debouncedValidate} />
						<InputRightElement children={<></>} />
					</InputGroup>
				</FormControl>
				{/* <ServerURLInput /> */}
			</Form>
		</div>
	);
}
