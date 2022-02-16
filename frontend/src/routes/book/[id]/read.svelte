<!-- TODO: maybe clean this up a bit? -->
<script context="module" lang="ts">
    import api from '@/lib/api';

    /** @type {import('@sveltejs/kit').Load} */
    export async function load({ url, params, fetch, session, stuff }) {
        const response = await api.media.getMediaById(params.id);

        if (!response.ok) {
            return {
                status: response.status,
                error: await response.text()
            };
        }

        const media: MediaWithProgress = await response.json();

        let search = url?.search;

        const defaultRedirect = {
            status: 302,
            // FIXME: potential edge cases that will break
            redirect: url?.pathname + '?page=1'
        };

        if (!search) {
            return defaultRedirect;
        }

        let mediaId: number = params.id;
        let page: number;

        try {
            page = parseInt(search.substr(1).split('&')[0].split('=')[1]);

            if (page === 0) {
                page = 1;
            }
        } catch {
            return defaultRedirect;
        }

        if (page > media.pages) {
            return {
                status: 302,
                redirect: url?.pathname + '?page=' + media.pages
            };
        }

        return {
            status: response.status,
            props: { mediaId, page }
        };
    }
</script>

<script lang="ts">
    export let mediaId: number;
    export let page: number;
</script>

<!-- TODO: comic reader goes here -->
<!-- TODO: render in portal/modal -->
<div class="flex items-center justify-center">
    <img
        class="max-h-[95vh] w-auto"
        src={api.media.getMediaPage(mediaId, page)}
        alt={`Page ${page}`}
    />
</div>
