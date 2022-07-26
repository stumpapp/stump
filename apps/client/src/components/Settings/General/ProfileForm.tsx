import { FieldValues, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useLocale } from '~hooks/useLocale';
import { useUser } from '~hooks/useUser';
import Button from '~ui/Button';
import Form from '~ui/Form';
import Input, { PasswordInput } from '~ui/Input';

import { FormControl, FormLabel } from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';

import SettingsFormContainer from '../SettingsFormContainer';

export default function ProfileForm() {
	const { user } = useUser();
	const { t } = useLocale();

	if (!user) {
		return null;
	}

	const schema = z.object({
		username: z.string().min(1, { message: t('loginPage.form.validation.missingUsername') }),
		password: z.string().optional(),
	});

	const form = useForm({
		resolver: zodResolver(schema),
		defaultValues: {
			username: user.username,
			// password: '',
		} as FieldValues,
	});

	async function handleSubmit(values: FieldValues) {}

	return (
		<SettingsFormContainer title="Account" subtitle="This is just your basic account information">
			<Form form={form} onSubmit={handleSubmit}>
				<FormControl>
					<FormLabel htmlFor="username">
						{t('settingsPage.general.profileForm.labels.username')}
					</FormLabel>
					<Input
						variant="flushed"
						type="text"
						// Note: Not really sure I want autofocus.
						placeholder="Enter a new username"
						{...form.register('username')}
					/>
				</FormControl>

				<FormControl>
					<FormLabel htmlFor="password">
						{t('settingsPage.general.profileForm.labels.password')}
					</FormLabel>

					<PasswordInput
						variant="flushed"
						autoComplete="new-password"
						placeholder="Enter a new password"
						{...form.register('password')}
					/>
				</FormControl>

				<Button alignSelf="end" type="submit" colorScheme="brand">
					Update Account
				</Button>
			</Form>
		</SettingsFormContainer>
	);
}
