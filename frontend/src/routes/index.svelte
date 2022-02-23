<!-- <script context="module" lang="ts">
    import api from '@lib/api';

    /** @type {import('@sveltejs/kit').Load} */
    export async function load({ fetch }) {
        const res = await api.media.getMedia(fetch);
        const libRes = await api.library.getLibraries(fetch);

        return {
            status: res.status,
            stuff: {
                media: res.ok && (await res.json()),
                libraries: libRes.ok && (await libRes.json())
            }
        };
    }
</script> -->

<p class="text-white">Home</p>
