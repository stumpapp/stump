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
        class="hover:border-brand rounded-t-md border border-transparent px-1.5 transition-all duration-200"
    >
        <!-- Trying to keep the 3:2 aspect ratio of comic books -->
        <img
            id={String(media.id)}
            alt="{media.name} thumbnail"
            class="h-72 w-auto max-w-[12rem] object-scale-down"
            src={api.media.getMediaThumbnail(media.id)}
            on:error={(err) => {
                // TODO: does not work after reload. Will load the alt
                // @ts-ignore: this works
                err.target.src = '/favicon.png';
            }}
        />
    </div>

    <div class="p-2 max-w-[12rem]">
        <h3 title={media.name} class="text-gray-100 truncate">{media.name}</h3>
    </div>
</a>
