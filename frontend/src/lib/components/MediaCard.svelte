<script lang="ts">
	import api from '@lib/api';

	export let media: MediaWithProgress;
</script>

<!-- TODO: href based on next page -->
<a href={`/book/${media.id}`} class="col-span-1 rounded-md bg-gray-800">
	<!-- on:error={(err) => console.log({ series, err })} -->
	<!-- on:error={(err) => loadError = true} -->
	<!-- TODO: figure out why this was not working, causing multiple to fail
      when in reality only one failed -->

	<div
		class="border border-transparent hover:border-brand transition-all duration-200 px-1.5 rounded-t-md"
	>
		<!-- Trying to keep the 3:2 aspect ratio of comic books -->
		<img
			id={String(media.id)}
			alt="{media.name} thumbnail"
			class="object-scale-down h-72 w-auto max-w-[12rem]"
			src={api.media.getMediaThumbnail(media.id)}
			on:error={(err) => {
				// @ts-ignore: TODO add fallback
				err.target.src = '/favicon.png';
			}}
		/>
	</div>

	<div class="p-2">
		<h3 class="text-gray-100">{media.name}</h3>
	</div>
</a>
