<!-- <script context="module" lang="ts">
	import api from '@lib/api';

	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ stuff }) {
		return {
			status: 200,
			props: {
				// libraries: stuff.libraries,
			},
		};
	}
</script> -->
<script lang="ts">
	import clsx from 'clsx';
	import { page } from '$app/stores';
	import { Disclosure, DisclosureButton, DisclosurePanel } from '@rgossiaux/svelte-headlessui';
	import House from 'phosphor-svelte/lib/House';
	import Books from 'phosphor-svelte/lib/Books';
	import Gear from 'phosphor-svelte/lib/Gear';
	import ArrowSquareOut from 'phosphor-svelte/lib/ArrowSquareOut';
	import LibraryOptionsMenu from './LibraryOptionsMenu.svelte';
	import ThemeToggle from './ThemeToggle.svelte';

	export let libraries: Library[];

	let current_library = $page.params.id;
	let pathname = $page.url.pathname;

	const navigation = [
		{
			name: 'Home',
			href: '/',
			current: pathname === '/',
			icon: House,
		},
		{
			name: 'Libraries',
			current: false,
			children: libraries?.map((library) => ({
				...library,
				href: `/libraries/${library.id}`,
				current: current_library == String(library.id),
			})),
			icon: Books,
		},
		{
			name: 'Server Settings',
			current: pathname === '/settings',
			href: '/settings',
			icon: Gear,
		},
	];

	// @ts-ignore
	let APP_VERSION = __APP_VERSION__;
</script>

<div
	class="flex h-full w-52 shrink-0 flex-col border-r border-gray-200 bg-white pt-5 pb-4 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200"
>
	<div class="flex flex-shrink-0 items-center space-x-4 px-4">
		<img class="h-12 w-auto" src="/favicon.png" alt="Stump" />
		<h3 class="text-brand font-bold">Stump</h3>
	</div>
	<div class="mt-5 flex flex-grow flex-col">
		<nav class="flex-1 space-y-1 bg-white px-2 dark:bg-gray-800" aria-label="Sidebar">
			{#each navigation as item}
				{#if !item.children}
					<a
						href={item.href}
						class:disclosure-current={item.current}
						class:disclosure-btn={!true}
						class="group flex w-full items-center space-x-2 rounded-md p-2 text-left text-sm font-medium"
					>
						<!-- <Fa icon={item.icon} /> -->
						<svelte:component this={item.icon} size={'1.25rem'} />
						<span>{item.name}</span>
					</a>
				{:else}
					<Disclosure as="div" class="space-y-1" let:open>
						<DisclosureButton
							class="w-full flex items-center space-x-2 p-2 text-left text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
						>
							<div class="flex space-x-2 items-center flex-1 w-full">
								<!-- <Fa icon={item.icon} /> -->
								<svelte:component this={item.icon} size={'1.25rem'} />
								<span>{item.name}</span>
							</div>
							<svg
								class={clsx(
									open
										? 'rotate-90 transition-all duration-200'
										: 'rotate-270 transition-all duration-200',
									'mr-2 flex-shrink-0 h-5 w-5 transform group-hover:text-gray-400 transition-colors ease-in-out duration-150',
								)}
								viewBox="0 0 20 20"
								aria-hidden="true"
							>
								<path d="M6 6L14 10L6 14V6Z" fill="currentColor" />
							</svg>
						</DisclosureButton>
						<!-- TODO: animate me -->
						<DisclosurePanel class="pt-1 space-y-1">
							{#each item.children as child}
								<!-- FIXME: class:active={child.current} not reactive?? also causes full rerender of sidebar? -->
								<!-- TODO: once this works, it will have a major bug: navigating to a series in the library will not register as active smh. Come up with different solution -->

								<div
									class="group w-full flex items-center pl-7 p-1.5 text-sm font-medium rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-900 dark:hover:text-gray-300 transition-colors duration-100"
								>
									<a class="flex-1 w-full" href={child.href}>{child.name}</a>
									<LibraryOptionsMenu library={child} />
								</div>
							{/each}
						</DisclosurePanel>
					</Disclosure>
				{/if}
			{/each}
		</nav>
	</div>

	<footer class="flex items-center justify-between px-2">
		<a
			href="https://github.com/aaronleopold/stump"
			target="__blank"
			rel="noopener noreferrer"
			class="text-sm flex space-x-2 items-center"
			title="View Stump on GitHub"
		>
			<!-- @ts-ignore -->
			<span>v{APP_VERSION}</span>
			<ArrowSquareOut />
		</a>

		<ThemeToggle />
	</footer>
</div>

<style lang="postcss">
	.open {
		@apply rotate-90 text-gray-400;
	}

	.closed {
		@apply text-gray-300;
	}

	/* FIXME: tailwind utilities not working? */
	/* .active {
		@apply text-brand-400 bg-gray-100 dark:bg-gray-900;
	} */
</style>
