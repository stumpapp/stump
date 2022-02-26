<script lang="ts">
	import clsx from 'clsx';
	import { WarningCircle } from 'phosphor-svelte';

	export let label: string;
	export let type = 'text';
	export let name: string;
	export let id: string;
	export let placeholder: string;
	export let htmlFor: Option<string> = undefined;
	export let value: Option<string> = undefined;
	export let disabled: boolean = false;

	export let error: boolean = false;

	$: console.log(error);
</script>

<div>
	<label for={htmlFor} class="block text-sm font-medium text-gray-700 dark:text-gray-200">
		{label}
	</label>
	<div class="mt-1 relative rounded-md shadow-sm">
		<!-- THIS IS SO DUMB >:( svelte fix this >:( type should be able to be dynamic -->
		{#if type === 'password'}
			<input
				type="password"
				{name}
				{id}
				{placeholder}
				{disabled}
				bind:value
				class:error
				class="shadow-sm focus:ring-brand-500 focus:border-brand-500 block w-full sm:text-sm border-gray-300 rounded-md pr-10"
			/>
		{:else}
			<input
				type="text"
				{name}
				{id}
				{placeholder}
				{disabled}
				bind:value
				class:error
				class="shadow-sm focus:ring-brand-500 focus:border-brand-500 block w-full sm:text-sm border-gray-300 rounded-md pr-10"
			/>
		{/if}

		{#if error}
			<div
				class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-red-500"
			>
				<WarningCircle size="1.25rem" aria-hidden="true" />
			</div>
		{/if}
	</div>
</div>

<style>
	.error {
		@apply border-red-300 text-red-900 placeholder-red-300;
	}

	.error:focus {
		@apply ring-1 ring-red-500 border-red-500;
	}

	.disabled {
		/* TODO: make me */
	}
</style>
