<script context="module" lang="ts">
	import { resolveResponse } from '@/lib/util/response';

	import api, { baseUrl } from '@lib/api';

	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch, stuff }) {
		let media = stuff?.media;

		// console.log('STUFF MEDIA', media);

		if (!media) {
			media = await fetch(`${baseUrl}/api/media`, { credentials: 'include' })
				.then((res) => resolveResponse(res))
				.catch(() => []);
		}

		return {
			props: {
				media,
			},
		};
	}
</script>

<script lang="ts">
	import MoreLink from '@/lib/components/ui/MoreLink.svelte';

	export let media: MediaWithProgress[];
	$: recentlyAdded = media
		.filter((m) => !!m.updated_at)
		.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
	$: keepReading = media.filter((m) => m.current_page !== undefined && m.current_page < m.pages);
	$: finishedBooks = media.filter((m) => m.current_page === m.pages);
</script>

{#if !media || !media.length}
	Media could not be loaded.
{:else}
	<div>
		<!-- SEARCH BAR -->

		<!-- Recently Added Section -->
		<div>
			<div class="flex w-full justify-between items-center">
				<h3>Recently Added</h3>
				<MoreLink href="#" />
			</div>

			<div class="flex space-x-2 items-center">
				{#each recentlyAdded as m}
					<a class="flex flex-1 p-4 space-x-4" href={`/media/${m.id}`}>
						<img class="max-h-48 rounded-md" src={api.media.getMediaThumbnail(m.id)} alt={m.name} />

						<div class="flex flex-col space-y-4">
							{m.name}
						</div>
					</a>
				{/each}
			</div>
		</div>
	</div>
{/if}
