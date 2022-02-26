<script>
	import '@/app.css';
	import NProgress from '@/lib/components/NProgress.svelte';
</script>

<NProgress />

<main class="flex h-full w-full justify-center items-center">
	<slot />
</main>
