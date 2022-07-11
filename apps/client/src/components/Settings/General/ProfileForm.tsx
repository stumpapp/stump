import {
	FormControl,
	FormLabel,
	InputGroup,
	InputRightElement,
	useBoolean,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence } from 'framer-motion';
import { Eye, EyeSlash, Lock, LockKeyOpen } from 'phosphor-react';
import React from 'react';
import { FieldValues, useForm } from 'react-hook-form';
import { z } from 'zod';
import Button from '~components/ui/Button';
import Form from '~components/ui/Form';
import Input from '~components/ui/Input';
import { useLocale } from '~hooks/useLocale';
import { useUser } from '~hooks/useUser';
import SettingsFormContainer from '../SettingsFormContainer';

export default function ProfileForm() {
	const user = useUser();
	const [showPass, { toggle }] = useBoolean(false);
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
					<Input variant="flushed" type="text" autoFocus {...form.register('username')} />
				</FormControl>

				<FormControl>
					<FormLabel htmlFor="password">
						{t('settingsPage.general.profileForm.labels.password')}
					</FormLabel>
					<InputGroup>
						<Input variant="flushed" type="text" autoFocus {...form.register('password')} />

						<InputRightElement
							children={
								// TODO: fades
								<AnimatePresence>
									{showPass ? (
										<Eye cursor="pointer" color="white" onClick={toggle} />
									) : (
										<EyeSlash cursor="pointer" color="white" onClick={toggle} />
									)}
								</AnimatePresence>
							}
						/>
					</InputGroup>
				</FormControl>

				<Button alignSelf="end" type="submit" colorScheme="brand">
					Update Account
				</Button>
			</Form>
		</SettingsFormContainer>
	);
}
