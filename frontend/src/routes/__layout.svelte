<script context="module" lang="ts">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ url, stuff, session }) {
		const libraries = await api.library
			.getLibraries()
			.then((res) => res.json())
			.catch((err) => {
				console.log(err);
				// TODO: DETECT 401 AND REDIRECT TO LOGIN
				return [];
			});

		const media = await api.media
			.getMedia()
			.then((res) => res.json())
			.catch((err) => {
				console.log(err);
				// TODO: DETECT 401 AND REDIRECT TO LOGIN
				return [];
			});

		return {
			status: 200,
			props: {
				libraries,
			},
			stuff: {
				media,
			},
		};
	}
</script>

<script lang="ts">
	import '@/app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { preferences } from '@store/preferences';
	import Sidebar from '@components/Sidebar.svelte';
	import NProgress from '@components/NProgress.svelte';
	import api from '@/lib/api';

	export let libraries: Library[];

	async function beforeUnload(e) {
		e.preventDefault();

		let current_page = $page;
		let reading_page = current_page.url.searchParams.get('page');
		let current_media = current_page.params.id;

		if (current_page.url.pathname.includes('/read') && reading_page && current_media) {
			await api.media.updateProgress(parseInt(current_media, 10), parseInt(reading_page, 10));
		} else {
			// await api.library.getLibraries();
		}

		// e.returnValue = '';
		// return '...'
		return null;
	}

	onMount(() => {
		preferences.useLocalStorage((current) => {
			if (current.darkMode) {
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.classList.remove('dark');
			}
		});
	});

	console.log($page.url.pathname !== '/login');
</script>

<svelte:window on:beforeunload={beforeUnload} />

<NProgress />

<div class="flex h-full flex-row">
	<Sidebar bind:libraries />
	<main class="flex-1 p-4 overflow-y-scroll scrollbar-hide">
		<slot />
	</main>
</div>
