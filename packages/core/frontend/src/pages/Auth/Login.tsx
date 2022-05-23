import React, { useEffect } from 'react';
import { FieldValues, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import shallow from 'zustand/shallow';
import { login } from '~api/query/auth';
import Form from '~components/ui/Form';
import Input from '~components/ui/Input';
import { useStore } from '~store/store';

import { Button, Container, HStack, Text } from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from 'react-query';
import toast from 'react-hot-toast';

export default function Login() {
	const { user, setUserAndPreferences } = useStore(
		({ user, setUserAndPreferences }) => ({ user, setUserAndPreferences }),
		shallow,
	);

	const { isLoading, mutate } = useMutation('loginUser', {
		mutationFn: login,
		onSuccess: (res) => {
			if (!res.data) {
				throw new Error('Login failed.');
			}

			setUserAndPreferences(res.data);
		},
		onError: (err) => {
			// TODO: handle this error
			toast.error('Login failed. Please try again.');
			console.error(err);
		},
	});

	const navigate = useNavigate();

	const schema = z.object({
		username: z.string().min(1, { message: 'Username is required' }),
		password: z.string().min(1, { message: 'Password is required' }),
	});

	const form = useForm({
		resolver: zodResolver(schema),
	});

	async function handleSubmit(values: FieldValues) {
		const { username, password } = values;

		mutate({ username, password });
	}

	useEffect(() => {
		if (user) {
			navigate('/');
		}
	}, [user]);

	// TODO: form.formState.errors
	return (
		<Container p="4">
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

			<Form form={form} onSubmit={handleSubmit}>
				<Input label="Username" type="text" autoFocus {...form.register('username')} />
				<Input label="Password" type="password" {...form.register('password')} />

				<Button
					isLoading={isLoading}
					type="submit"
					bgGradient="linear(to-r, brand.600, brand.400)"
					_hover={{ bgGradient: 'linear(to-r, brand.700, brand.500)' }}
				>
					Login
				</Button>
			</Form>
		</Container>
	);
}
