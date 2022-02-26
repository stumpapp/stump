<script lang="ts">
	import { z } from 'zod';
	import Input from '@/lib/components/ui/Input.svelte';
	import Button from '@/lib/components/ui/Button.svelte';
	import { goto } from '$app/navigation';

	let username = '';
	let password = '';
	let errors = [];

	const schema = z.object({
		username: z.string().min(1, { message: 'Username is required' }),
		password: z.string().min(1, { message: 'Password is required' }),
	});

	async function handleSubmit() {
		try {
			const res = await fetch('/auth/login', {
				method: 'POST',
				body: JSON.stringify({
					username,
					password,
				}),
				headers: {
					'Content-Type': 'application/json',
				},
			});

			console.log(res);

			if (res.ok) {
				// dispatch('success');
				goto('/');
			} else {
				// error = 'An error occured';
				console.log('error');
			}
		} catch (err) {
			console.log(err);
		}
	}

	async function validate() {
		errors = [];
		try {
			schema.parse({ username, password });

			handleSubmit();
		} catch (err) {
			const { issues } = err ?? {};

			errors = issues?.map(({ message, path }) => ({ [path[0]]: message }));
		}
	}

	$: usernameError = errors.find(({ username }) => username);
	$: passwordError = errors.find(({ password }) => password);
</script>

<div class="flex flex-col space-y-4">
	<h3 class="font-bold text-2xl text-center dark:text-gray-200">Login to your account</h3>

	<form class="flex flex-col space-y-4" on:submit|preventDefault={validate}>
		<Input
			id="username"
			label="Username"
			type="text"
			name="username"
			placeholder="oromei"
			bind:value={username}
			error={!!usernameError}
		/>
		<Input
			id="password"
			label="Password"
			type="password"
			name="password"
			placeholder="*********"
			bind:value={password}
			error={!!passwordError}
		/>

		<Button type="submit">Login</Button>
	</form>
</div>
