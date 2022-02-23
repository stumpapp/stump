<script lang="ts">
    import Moon from 'phosphor-svelte/lib/Moon';
    import Sun from 'phosphor-svelte/lib/Sun';
    import { preferences } from '@/store/preferences';

    $: enabled = $preferences.darkMode;

    function toggle() {
        preferences.set({ darkMode: !enabled });
    }
</script>

<div class="inline-block">
    <button
        title="Toggle Theme"
        class="hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-md"
        on:click={toggle}
    >
        <span class="sr-only">Toggle Application Theme</span>
        {#if enabled}
            <Moon />
        {:else}
            <Sun />
        {/if}
    </button>
</div>
