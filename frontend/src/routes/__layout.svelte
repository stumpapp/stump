<script context="module" lang="ts">
    import api, { baseUrl } from '@lib/api';

    /** @type {import('@sveltejs/kit').Load} */
    export async function load({ fetch }) {
        const response = await fetch(`${baseUrl}/api/library`).catch((err) => console.log(err));

        return {
            status: response?.status ?? 502,
            props: {
                libraries: response?.ok && (await response.json())
            }
        };
    }
</script>

<script lang="ts">
    import '@/app.css';
    import { onMount, onDestroy } from 'svelte';
    import { page } from '$app/stores';
    import { preferences } from '@store/preferences';
    import Sidebar from '@components/Sidebar.svelte';

    export let libraries: Library[];

    async function beforeUnload(e) {
        e.preventDefault();

        let current_page = $page;
        let reading_page = current_page.url.searchParams.get('page');
        let current_media = current_page.params.id;

        if (current_page.url.pathname.includes('/read') && reading_page && current_media) {
            await api.media.updateProgress(parseInt(current_media, 10), parseInt(reading_page, 10));
        } else {
            await api.library.getLibraries();
        }

        // e.returnValue = '';
        // return '...'
        return null;
    }

    onMount(() => {
        preferences.subscribe((current) => {
            if (current.darkMode) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        });
    });
</script>

<svelte:window on:beforeunload={beforeUnload} />

<div class="flex h-full flex-row">
    <Sidebar bind:libraries />
    <main class="flex-1 p-3">
        <slot />
    </main>
</div>
