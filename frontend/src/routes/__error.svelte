<script context="module">
	/** @type {import('@sveltejs/kit').ErrorLoad} */
	export function load({ error, status }) {
		console.log(error);

		return {
			props: {
				status
			}
		};
	}
</script>

<script>
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
</div>
