<script context="module" lang="ts">
	import { baseUrl } from '@lib/api';

	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch }) {
		const response = await fetch(`${baseUrl}/api/library`);

		return {
			status: response.status,
			props: {
				libraries: response.ok && (await response.json())
			}
		};
	}
</script>

<script>
	import '@/app.css';
	import { onMount } from 'svelte';
	import { preferences } from '@store/preferences';
	import Sidebar from '@components/Sidebar.svelte';

	export let libraries;

	onMount(() => {
		preferences.subscribe((current) => {
			if (current.darkMode) {
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.classList.remove('dark');
			}
		});
	});
</script>

<div class="flex flex-row h-full">
	<Sidebar bind:libraries />
	<main class="flex-1 p-3">
		<slot />
	</main>
</div>
