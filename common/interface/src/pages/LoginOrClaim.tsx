import { useEffect, useState } from 'react';
import { FieldValues, useForm } from 'react-hook-form';
import { Navigate } from 'react-router-dom';
import { z } from 'zod';
// import { login } from '~api/auth';
// import Form from '~ui/Form';
// import Input from '~ui/Input';
// import { useStore } from '~stores/mainStore';

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
import toast from 'react-hot-toast';
import { queryClient, useLoginOrRegister, useUserStore } from '@stump/client';
import Form from '../ui/Form';
import Input from '../ui/Input';
// import { useLocale } from '~hooks/useLocale';

export default function LoginOrClaim() {
	const { user, setUser } = useUserStore();

	const { isClaimed, isCheckingClaimed, loginUser, registerUser, isLoggingIn, isRegistering } =
		useLoginOrRegister({
			onSuccess: setUser,
		});

	const schema = z.object({
		// username: z.string().min(1, { message: t('loginPage.form.validation.missingUsername') }),
		// password: z.string().min(1, { message: t('loginPage.form.validation.missingPassword') }),
		username: z.string().min(1, { message: 'loginPage.form.validation.missingUsername' }),
		password: z.string().min(1, { message: 'loginPage.form.validation.missingPassword' }),
	});

	const form = useForm({
		resolver: zodResolver(schema),
	});

	async function handleSubmit(values: FieldValues) {
		const { username, password } = values;
		const doLogin = async (firstTime = false) =>
			toast.promise(loginUser({ username, password }), {
				// loading: t('loginPage.toasts.loggingIn'),
				// success: firstTime
				// 	? t('loginPage.toasts.loggedInFirstTime')
				// 	: t('loginPage.toasts.loggedIn'),
				// error: t('loginPage.toasts.loginFailed'),
				loading: 'Logging in...',
				success: firstTime ? 'Logged in for the first time' : 'Logged in',
				error: 'Login failed',
			});
		if (isClaimed) {
			await doLogin();
		} else {
			toast
				.promise(registerUser({ username, password }), {
					// loading: t('loginPage.toasts.registering'),
					// success: t('loginPage.toasts.registered'),
					// error: t('loginPage.toasts.registrationFailed'),
					loading: 'Registering...',
					success: 'Registered',
					error: 'Registration failed',
				})
				.then(() => doLogin(true));
		}
	}

	if (user) {
		queryClient.invalidateQueries(['getLibraries']);
		return <Navigate to="/" />;
	} else if (isCheckingClaimed) {
		return null;
	}

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
					{/* {t('loginPage.claimText')} */}
				</Alert>
			)}

			<Form form={form} onSubmit={handleSubmit}>
				<FormControl>
					{/* <FormLabel htmlFor="username">{t('loginPage.form.labels.username')}</FormLabel> */}
					<Input type="text" autoFocus {...form.register('username')} />
				</FormControl>

				<FormControl>
					{/* <FormLabel htmlFor="passowrd">{t('loginPage.form.labels.password')}</FormLabel> */}
					<Input type="password" {...form.register('password')} />
				</FormControl>

				<Button
					isLoading={isLoggingIn || isRegistering}
					type="submit"
					color="gray.100"
					bgGradient="linear(to-r, brand.600, brand.400)"
					_hover={{ bgGradient: 'linear(to-r, brand.700, brand.500)' }}
				>
					{/* {isClaimed
						? t('loginPage.form.buttons.login')
						: t('loginPage.form.buttons.createAccount')} */}
					{isClaimed ? 'Login' : 'Create account'}
				</Button>
			</Form>
		</Stack>
	);
}
