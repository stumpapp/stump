<script context="module" lang="ts">
    import api from '@/lib/api';

    /** @type {import('@sveltejs/kit').Load} */
    export async function load({ params, fetch, session, stuff }) {
        const response = await api.media.getMediaById(params.id);

        let media: MediaWithProgress = response.ok && (await response.json());

        return {
            status: response.status,
            props: { media }
        };
    }
</script>

<script lang="ts">
    import MediaThumbnail from '@/lib/components/MediaThumbnail.svelte';

    export let media: MediaWithProgress;

    console.log(media);
</script>

{#if !media}
    <p>Media could not be loaded</p>
{:else}
    <div class="flex space-x-4 text-gray-100">
        <MediaThumbnail {media} />

        <div>
            <h3 class="font-bold text-lg">{media.name}</h3>

            <p>
                from
                <span class="italic font-medium">Series Name</span>
            </p>

            <div class="pt-4"><p class="max-w-[75%] text-sm">{media.description}</p></div>
        </div>
    </div>
{/if}
