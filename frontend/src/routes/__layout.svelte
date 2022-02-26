<script context="module" lang="ts">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch }) {
		const libraries = await api.library
			.getLibraries()
			.then((res) => resolveResponse(res))
			.catch((err) => {
				throw new Error(err);
			});

		const media = await fetch(`${baseUrl}/api/media`)
			.then((res) => resolveResponse(res))
			.catch((err) => {
				throw new Error(err);
			});

		const redirect = [media, libraries].find((item) => 'redirect' in item);

		if (redirect) {
			console.log('REDIRECT CAUGHT', redirect);
			return redirect;
		}

		return {
			status: 200,
			props: {
				libraries,
			},
			// TODO: should I use stuff or an actual store?
			stuff: {
				media,
			},
		};
	}
</script>

<script lang="ts">
	import '../app.css';
	import '@/app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { preferences } from '@store/preferences';
	import Sidebar from '@components/Sidebar.svelte';
	import NProgress from '@components/NProgress.svelte';
	import api, { baseUrl } from '@/lib/api';
	import { resolveResponse } from '@/lib/util/response';

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
	<Sidebar {libraries} />
	<main class="flex-1 p-4 overflow-y-scroll scrollbar-hide">
		<slot />
	</main>
</div>
