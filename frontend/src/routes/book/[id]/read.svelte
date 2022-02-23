<!-- TODO: maybe clean this up a bit? -->
<script context="module" lang="ts">
    import api from '@/lib/api';
    import { onMount } from 'svelte';

    /** @type {import('@sveltejs/kit').Load} */
    export async function load({ url, stuff }) {
        let { media }: { media: MediaWithProgress } = stuff;

        let search = url?.search;

        const defaultRedirect = {
            status: 302,
            // FIXME: potential edge cases that will break
            redirect: url?.pathname + '?page=1'
        };

        if (!search) {
            return defaultRedirect;
        }

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
            status: 200,
            props: { media, page }
        };
    }
</script>

<script lang="ts">
    import { beforeNavigate, goto } from '$app/navigation';
    import ComicToolbar from '@/lib/components/book/ComicToolbar.svelte';
    import { hotkey } from 'svelte-gh-hotkey';
    import { portal } from 'svelte-portal';

    export let media: MediaWithProgress;
    export let page: number;

    let htmlContent;
    let showToolbar = false;

    async function getPageHtml() {
        const response = await api.media.getMediaHtmlPage(media.id, page);

        if (response.ok) {
            const content = await response.text();
            htmlContent = content;
        }
    }

    onMount(async () => {
        // if epub
        await getPageHtml();
    });

    function nextPage() {
        if (page < media.pages - 1) {
            goto(`/book/${media.id}/read?page=${page + 1}`);
        }
    }

    function prevPage() {
        if (page > 1) {
            goto(`/book/${media.id}/read?page=${page - 1}`);
        }
    }

    beforeNavigate(async ({ to }) => {
        const toPage = parseInt(to.searchParams.get('page'), 10);
        // TODO: animate img left or right??

        // FIXME: this will not work until the auth is fixed on the backend.
        await api.media.updateProgress(media.id, toPage);
    });

    // afterNavigate -> animage img left or right??
</script>

<div class="fixed inset-0 bg-black z-30" use:portal={'body'} hidden>
    <div class="h-full flex items-center justify-center">
        <div class="h-full grow" on:click={prevPage} use:hotkey={'ArrowLeft'} />
        <img
            class="h-[100vh] w-auto"
            src={api.media.getMediaPage(media.id, page)}
            alt={`Page ${page}`}
            on:click={() => (showToolbar = !showToolbar)}
        />
        <div class="h-full grow" on:click={nextPage} use:hotkey={'ArrowRight'} />
    </div>

    <ComicToolbar {showToolbar} {media} />

    <!-- TODO: what to do for epub... -->
    <!-- <div class="w-full h-full text-white max-w-4xl">
        {#if htmlContent}
            {@html htmlContent}
        {/if}
    </div> -->
</div>

<style>
</style>
