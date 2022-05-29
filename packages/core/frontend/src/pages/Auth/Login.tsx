import React, { useEffect, useState } from 'react';
import { FieldValues, useForm } from 'react-hook-form';
import { Navigate } from 'react-router-dom';
import { z } from 'zod';
import shallow from 'zustand/shallow';
import { login } from '~api/query/auth';
import Form from '~components/ui/Form';
import Input from '~components/ui/Input';
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
import { useMutation, useQuery } from 'react-query';
import toast from 'react-hot-toast';
import { checkIsClaimed } from '~api/query/server';
import { register } from '~api/mutation/auth';
import client from '~api/client';

export default function Login() {
	const [isClaimed, setIsClaimed] = useState(true);

	const { data: claimCheck, isLoading: isCheckingClaimed } = useQuery('checkIsClaimed', {
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

	const { user, setUserAndPreferences } = useStore(
		({ user, setUserAndPreferences }) => ({ user, setUserAndPreferences }),
		shallow,
	);

	const { isLoading: isLoggingIn, mutateAsync: loginUser } = useMutation('loginUser', {
		mutationFn: login,
		onSuccess: (res) => {
			if (!res.data) {
				throw new Error('Login failed.');
			}

			client.invalidateQueries('getLibraries');

			setUserAndPreferences(res.data);
		},
		onError: (err) => {
			// TODO: handle this error
			toast.error('Login failed. Please try again.');
			console.error(err);
		},
	});

	const { isLoading: isRegistering, mutateAsync: registerUser } = useMutation('registerUser', {
		mutationFn: register,
	});

	const schema = z.object({
		username: z.string().min(1, { message: 'Username is required' }),
		password: z.string().min(1, { message: 'Password is required' }),
	});

	const form = useForm({
		resolver: zodResolver(schema),
	});

	async function handleSubmit(values: FieldValues) {
		const { username, password } = values;

		const doLogin = async (firstTime = false) =>
			toast.promise(loginUser({ username, password }), {
				loading: 'Logging in...',
				success: firstTime ? 'Welcome! Redirecting...' : 'Welcome back! Redirecting...',
				error: 'Login failed. Please try again.',
			});

		if (isClaimed) {
			await doLogin();
		} else {
			toast
				.promise(registerUser({ username, password }), {
					loading: 'Registering...',
					success: 'Registered!',
					error: 'Registration failed. Please try again.',
				})
				.then(() => doLogin(true));
		}
	}

	if (user) {
		client.invalidateQueries('getLibraries');
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
					This Stump server is not yet claimed, you can use the form below to create a user account
					and claim it. Enter your preferred username and password.
				</Alert>
			)}

			<Form form={form} onSubmit={handleSubmit}>
				<FormControl>
					<FormLabel htmlFor="username">Username</FormLabel>
					<Input type="text" autoFocus {...form.register('username')} />
				</FormControl>

				<FormControl>
					<FormLabel htmlFor="passowrd">Password</FormLabel>
					<Input type="password" {...form.register('password')} />
				</FormControl>

				<Button
					isLoading={isLoggingIn || isRegistering}
					type="submit"
					bgGradient="linear(to-r, brand.600, brand.400)"
					_hover={{ bgGradient: 'linear(to-r, brand.700, brand.500)' }}
				>
					{isClaimed ? 'Login' : 'Create Account'}
				</Button>
			</Form>
		</Stack>
	);
}
