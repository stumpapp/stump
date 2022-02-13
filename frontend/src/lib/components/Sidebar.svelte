<script lang="ts">
	import clsx from 'clsx';
	import { page } from '$app/stores';
	import { Disclosure, DisclosureButton, DisclosurePanel } from '@rgossiaux/svelte-headlessui';
	import Fa from 'svelte-fa';
	import { faHome, faBook, faCog } from '@fortawesome/free-solid-svg-icons';
	import LibraryOptionsMenu from './LibraryOptionsMenu.svelte';

	export let libraries: Library[];

	let current_library = $page.params.id;
	let pathname = $page.url.pathname;

	const navigation = [
		{ name: 'Home', href: '/', current: pathname === '/', icon: faHome },
		{
			name: 'Libraries',
			current: false,
			children: libraries?.map((library) => ({
				...library,
				href: `/libraries/${library.id}`,
				current: current_library == String(library.id)
			})),

			icon: faBook
		},
		{
			name: 'Server Settings',
			current: pathname === '/settings',
			href: '/settings',
			icon: faCog
		}
	];
</script>

<div
	class="flex shrink-0 h-full w-52 flex-col border-r border-gray-200 bg-white pt-5 pb-4 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200"
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
						<Fa icon={item.icon} />
						<span>{item.name}</span>
					</a>
				{:else}
					<Disclosure as="div" class="space-y-1" let:open>
						<DisclosureButton
							class="w-full flex items-center space-x-2 p-2 text-left text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
						>
							<div class="flex space-x-2 items-center flex-1 w-full">
								<Fa icon={item.icon} />
								<span>{item.name}</span>
							</div>
							<svg
								class={clsx(
									open
										? 'rotate-90 transition-all duration-200'
										: 'rotate-270 transition-all duration-200',
									'mr-2 flex-shrink-0 h-5 w-5 transform group-hover:text-gray-400 transition-colors ease-in-out duration-150'
								)}
								viewBox="0 0 20 20"
								aria-hidden="true"
							>
								<path d="M6 6L14 10L6 14V6Z" fill="currentColor" />
							</svg>
						</DisclosureButton>
						<DisclosurePanel class="pt-1 space-y-1">
							{#each item.children as child}
								<a
									href={child.href}
									class="group w-full flex items-center pl-7 p-1.5 text-sm font-medium rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900 dark:hover:text-gray-300 transition-colors duration-100"
								>
									<!-- TODO: get active state to work without the annoying rerender >:( -->
									<span class="flex-1 w-full">{child.name}</span>

									<LibraryOptionsMenu library={child} />
								</a>
							{/each}
						</DisclosurePanel>
					</Disclosure>
				{/if}
			{/each}
		</nav>
	</div>
</div>

<style>
	.open {
		@apply rotate-90 text-gray-400;
	}

	.closed {
		@apply text-gray-300;
	}

	.active {
		@apply text-brand-400;
	}
</style>
