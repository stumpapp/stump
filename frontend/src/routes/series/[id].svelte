<script context="module" lang="ts">
    import api from '@lib/api';

    /** @type {import('@sveltejs/kit').Load} */
    export async function load({ params }) {
        const response = await api.series.getSeries(params.id);

        let data: SeriesWithMedia = response.ok && (await response.json());

        return {
            status: response.status,
            props: data
        };
    }
</script>

<script lang="ts">
    import MediaCard from '@/lib/components/book/MediaCard.svelte';

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
