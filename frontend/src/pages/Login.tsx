import React, { useEffect } from 'react';
import { FieldValues, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import shallow from 'zustand/shallow';
import { login } from '~api/query/auth';
import Form from '~components/ui/Form';
import Input from '~components/ui/Input';
import { useStore } from '~store/store';

import { Button, Heading, Stack } from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';

export default function Login() {
	const { user, setUser } = useStore(({ user, setUser }) => ({ user, setUser }), shallow);
	const navigate = useNavigate();

	const schema = z.object({
		username: z.string().min(1, { message: 'Username is required' }),
		password: z.string().min(1, { message: 'Password is required' }),
	});

	const form = useForm({
		resolver: zodResolver(schema),
	});

	async function handleSubmit(values: FieldValues) {
		console.log(values);

		const { username, password } = values;

		const res = await login(username, password).catch((err) => err.response);

		if (res.status === 200) {
			setUser(res.data);
		} else {
			// TODO: handle error
			console.log(res);
		}
	}

	useEffect(() => {
		if (user) {
			navigate('/');
		}
	}, [user]);

	// TODO: form.formState.errors
	return (
		<Stack>
			<Heading as="h3">Login</Heading>

			<Form form={form} onSubmit={handleSubmit}>
				<Input label="Username" type="text" autoFocus {...form.register('username')} />
				<Input label="Password" type="password" {...form.register('password')} />

				<Button type="submit" colorScheme="brand">
					Login
				</Button>
			</Form>
		</Stack>
	);
}
