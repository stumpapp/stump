<script context="module" lang="ts">
	import api, { baseUrl } from '@lib/api';

	// TODO: type this properly
	interface GetLibraryReturn {
		library: any;
		series: any[];
	}

	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ params, fetch }) {
		const data: GetLibraryReturn = await fetch(`${baseUrl}/api/library/${params.id}`, {
			credentials: 'include',
		})
			.then((res) => resolveResponse(res))
			.catch(() => new Error('Failed to load series'));

		if ('redirect' in data) {
			return data;
		}

		return {
			status: 200,
			props: data,
		};
	}
</script>

<script lang="ts">
	import SeriesCard from '@components/series/SeriesCard.svelte';
	import { resolveResponse } from '@/lib/util/response';

	export let library;
	export let series;
</script>

{#if !library}
	<p>Library could not be loaded</p>
{:else if !series}
	<p>Library contains no series</p>
{:else}
	<div class="flex flex-col space-y-4">
		<h1 class="font-bold text-lg text-gray-100">{library.name}</h1>

		<div class="flex flex-wrap gap-4">
			{#each series as s}
				<SeriesCard series={s} />
			{/each}
		</div>
	</div>
{/if}
