<script context="module" lang="ts">
    import api from '@/lib/api';

    /** @type {import('@sveltejs/kit').Load} */
    export async function load({ params, fetch, session, stuff }) {
        const response = await api.media.getMediaById(params.id);

        let media: MediaWithProgress = response.ok && (await response.json());

        return {
            status: response.status,
            stuff: { media }
        };
    }
</script>

<slot />
