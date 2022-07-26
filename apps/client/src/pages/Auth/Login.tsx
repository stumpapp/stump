import { useEffect, useState } from 'react';
import { FieldValues, useForm } from 'react-hook-form';
import { Navigate } from 'react-router-dom';
import { z } from 'zod';
import shallow from 'zustand/shallow';
import { login } from '~api/auth';
import Form from '~ui/Form';
import Input from '~ui/Input';
import { useStore } from '~store/store';

import {
	Alert,
	AlertIcon,
	Button,
	Container,
	FormControl,
	FormLabel,
	HStack,
	Stack,
	Text,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { checkIsClaimed } from '~api/server';
import { register } from '~api/auth';
import client from '~api/client';
import { useLocale } from '~hooks/useLocale';

export default function Login() {
	const { t } = useLocale();

	const [isClaimed, setIsClaimed] = useState(true);

	const { data: claimCheck, isLoading: isCheckingClaimed } = useQuery(['checkIsClaimed'], {
		queryFn: checkIsClaimed,
	});

	if (isCheckingClaimed) {
		return null;
	}

	useEffect(() => {
		if (claimCheck?.data && !claimCheck.data.isClaimed) {
			setIsClaimed(false);
		}
	}, [claimCheck]);

	const { user, setUser } = useStore(({ user, setUser }) => ({ user, setUser }), shallow);

	const { isLoading: isLoggingIn, mutateAsync: loginUser } = useMutation(['loginUser'], {
		mutationFn: login,
		onSuccess: (res) => {
			if (!res.data) {
				throw new Error('Login failed.');
			}

			client.invalidateQueries(['getLibraries']);

			setUser(res.data);
		},
		onError: (err) => {
			// TODO: handle this error
			console.error(err);
		},
	});

	const { isLoading: isRegistering, mutateAsync: registerUser } = useMutation(['registerUser'], {
		mutationFn: register,
	});

	const schema = z.object({
		username: z.string().min(1, { message: t('loginPage.form.validation.missingUsername') }),
		password: z.string().min(1, { message: t('loginPage.form.validation.missingPassword') }),
	});

	const form = useForm({
		resolver: zodResolver(schema),
	});

	async function handleSubmit(values: FieldValues) {
		const { username, password } = values;

		const doLogin = async (firstTime = false) =>
			toast.promise(loginUser({ username, password }), {
				loading: t('loginPage.toasts.loggingIn'),
				success: firstTime
					? t('loginPage.toasts.loggedInFirstTime')
					: t('loginPage.toasts.loggedIn'),
				error: t('loginPage.toasts.loginFailed'),
			});

		if (isClaimed) {
			await doLogin();
		} else {
			toast
				.promise(registerUser({ username, password }), {
					loading: t('loginPage.toasts.registering'),
					success: t('loginPage.toasts.registered'),
					error: t('loginPage.toasts.registrationFailed'),
				})
				.then(() => doLogin(true));
		}
	}

	if (user) {
		client.invalidateQueries(['getLibraries']);
		return <Navigate to="/" />;
	}

	// TODO: form.formState.errors
	return (
		<Stack as={Container} p="4" spacing={4}>
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

			{!isClaimed && (
				<Alert status="warning" rounded="md">
					<AlertIcon />
					{t('loginPage.claimText')}
				</Alert>
			)}

			<Form form={form} onSubmit={handleSubmit}>
				<FormControl>
					<FormLabel htmlFor="username">{t('loginPage.form.labels.username')}</FormLabel>
					<Input type="text" autoFocus {...form.register('username')} />
				</FormControl>

				<FormControl>
					<FormLabel htmlFor="passowrd">{t('loginPage.form.labels.password')}</FormLabel>
					<Input type="password" {...form.register('password')} />
				</FormControl>

				<Button
					isLoading={isLoggingIn || isRegistering}
					type="submit"
					color="gray.100"
					bgGradient="linear(to-r, brand.600, brand.400)"
					_hover={{ bgGradient: 'linear(to-r, brand.700, brand.500)' }}
				>
					{isClaimed
						? t('loginPage.form.buttons.login')
						: t('loginPage.form.buttons.createAccount')}
				</Button>
			</Form>
		</Stack>
	);
}
