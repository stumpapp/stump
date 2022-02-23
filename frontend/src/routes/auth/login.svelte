<script lang="ts">
	import { goto } from '$app/navigation';

	let username, password;

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
				// goto('/');
			} else {
				// error = 'An error occured';
				console.log('error');
			}
		} catch (err) {
			console.log(err);
		}
	}
</script>

<form on:submit|preventDefault={handleSubmit}>
	<input type="text" name="username" placeholder="oromei" bind:value={username} />
	<input type="password" name="password" placeholder="*********" bind:value={password} />

	<button type="submit" class="bg-brand p-2">submit</button>
</form>
