<script lang="ts" context="module">
	export type ButtonType = 'button' | 'submit' | 'reset';
	export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';
	export type ButtonVariant = 'ghost' | 'primary' | 'secondary' | 'danger';
</script>

<script lang="ts">
	export let type: ButtonType = 'button';
	export let variant: ButtonVariant = 'primary';
	export let size: ButtonSize = 'md';
</script>

<button
	{type}
	class:sm={size === 'sm'}
	class:md={size === 'md'}
	class:lg={size === 'lg'}
	class:xl={size === 'xl'}
	class:primary={variant === 'primary'}
	class:secondary={variant === 'secondary'}
	class="inline-flex items-center border border-transparent text-sm leading-4 font-medium rounded-md dark:focus:ring-offset-gray-800"
>
	<slot />
</button>

<style>
	.sm {
		@apply px-2.5 py-1.5 text-sm;
	}

	.md {
		@apply px-3 py-2;
	}

	.lg {
		@apply px-4 py-2;
	}

	.xl {
		@apply px-6 py-3;
	}

	.primary {
		@apply shadow-sm text-white bg-brand-600;
	}

	.primary:hover {
		@apply bg-brand-700;
	}

	.primary:focus {
		@apply outline-none ring-2 ring-offset-2 ring-brand-500;
	}

	.secondary {
		@apply text-brand-700 bg-brand-100;
	}

	.secondary:hover {
		@apply bg-brand-200;
	}

	.secondary:focus {
		@apply outline-none ring-2 ring-offset-2 ring-brand-500;
	}
</style>
