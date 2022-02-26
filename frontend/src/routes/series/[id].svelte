<script context="module" lang="ts">
	import { baseUrl } from '@lib/api';

	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ params }) {
		const data: SeriesWithMedia = await fetch(`${baseUrl}/api/series/${params.id}`, {
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
	import MediaCard from '@/lib/components/book/MediaCard.svelte';
	import { resolveResponse } from '@/lib/util/response';

	export let series: Series;
	export let media: MediaWithProgress[];
</script>

{#if !series}
	<p>Series could not be loaded</p>
{:else}
	<div class="flex flex-col space-y-4">
		<h1 class="font-bold text-lg text-gray-100">{series.title}</h1>

		<div class="flex flex-wrap gap-4">
			{#each media as m}
				<MediaCard media={m} />
			{/each}
		</div>
	</div>
{/if}
