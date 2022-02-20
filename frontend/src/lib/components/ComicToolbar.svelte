<script lang="ts">
    import { ArrowLeft } from 'phosphor-svelte';
    import { slide } from 'svelte/transition';
    export let showToolbar;
    export let media: MediaWithProgress;
</script>

{#if showToolbar}
    <nav transition:slide class="fixed top-0 p-4 w-full bg-gray-700 text-white">
        <div class="flex justify-between items-center w-full">
            <div class="flex items-center">
                <a title={`Go to ${media.name} Overview`} href={`/book/${media.id}`}>
                    <ArrowLeft size={'1.25rem'} />
                </a>
            </div>
            <div class="flex items-center">todo</div>
        </div>
    </nav>
    <nav transition:slide class="fixed bottom-0 p-4 w-full bg-gray-700 text-white">testing 123</nav>
{/if}
