<script context="module">
    /** @type {import('@sveltejs/kit').ErrorLoad} */
    export function load({ error, status }) {
        console.log(error, status);
        if (status === 401) {
            return {
                status: 302,
                redirect: '/auth/login'
            };
        } else {
            return {
                props: {
                    status
                }
            };
        }
    }
</script>

<script>
    import { goto } from '$app/navigation';

    export let status;
</script>

<!-- Content rendered based on error status -->
<div class="text-white">
    {#if status === 404}
        <h1>Page not found</h1>
    {:else if status === 500}
        <h1>Internal server error</h1>
    {:else}
        <h1>Something went wrong</h1>
    {/if}

    <button on:click={() => goto('/')}>Go Home</button>
</div>
