<script context="module" lang="ts">
	import api, { baseUrl } from '@lib/api';

	// TODO: type this properly
	interface GetLibraryReturn {
		library: any;
		series: any[];
	}

	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ params, fetch }) {
		const response = await fetch(`${baseUrl}/api/library/${params.id}`);

		let data: GetLibraryReturn = response.ok && (await response.json());

		return {
			status: response.status,
			props: data
		};
	}
</script>

<script lang="ts">
	import SeriesCard from '@components/SeriesCard.svelte';

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
