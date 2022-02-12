<script context="module" lang="ts">
	import { baseUrl } from '@lib/api';

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
	export let library;
	export let series;
</script>

{#if !library}
	<p>Library could not be loaded</p>
{:else if !series}
	<p>Library contains no series</p>
{:else}
	<code class="text-white">{JSON.stringify(library ?? {}, null, 2)}</code>
	<br />
	<br />
	<code class="text-white">{JSON.stringify(series ?? [], null, 2)}</code>
{/if}
