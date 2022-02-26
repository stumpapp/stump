<script lang="ts">
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';

	export let href: string;
</script>

<a {href} class="flex space-x-2 items-center"><span>More</span> <ArrowRight size="1rem" /></a>
