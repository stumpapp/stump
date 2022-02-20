<script lang="ts">
    import { goto } from '$app/navigation';

    import api from '@/lib/api';

    let username, password;

    async function handleSubmit() {
        const response = await api.auth.login(username, password);

        console.log(response);

        if (response.ok) {
            console.log(await response.text());
            goto('/');
        } else {
            console.log(await response.text());
        }
    }
</script>

<form on:submit|preventDefault={handleSubmit}>
    <input type="text" name="username" placeholder="oromei" bind:value={username} />
    <input type="password" name="password" placeholder="*********" bind:value={password} />

    <button type="submit" class="bg-brand p-2">submit</button>
</form>
