<script lang="ts">
    import api from '@lib/api';

    export let media: MediaWithProgress;

    $: readUrl = media ? `/book/${media.id}/read?page=${media.current_page || 1}` : '';
</script>

<div class="flex">
    <a
        href={readUrl}
        class="flex rounded-md bg-gray-800 hover:border-brand border border-transparent px-1.5 transition-all duration-200"
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
    </a>

    <!-- TODO: progress bar if has progress -->
</div>
