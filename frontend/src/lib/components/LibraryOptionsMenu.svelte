<script lang="ts">
	import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@rgossiaux/svelte-headlessui';
	import DotsThreeVertical from 'phosphor-svelte/lib/DotsThreeVertical';
	import { ArrowsClockwise, NotePencil, Trash } from 'phosphor-svelte';

	export let library: Library;

	async function handleScan() {
		alert('TODO');

		// // watch for logs
		// const res = await api.library.scanLibrary(library.id);
		// console.log(res);
	}

	async function handleDelete() {
		alert('TODO');
		// const res = await fetch(`${baseUrl}/api/library/${library.id}`, {
		//     method: 'DELETE'
		// });
		// if (!res.ok) {
		//     // TODO: handle me
		//     console.error(await res.text());
		// }
	}
</script>

<!-- TODO: make not ugly -->

<div class="">
	<Menu as="div" class="relative inline-block text-left">
		<div>
			<!-- <MenuButton
				class="flex h-7 w-7 items-center justify-center rounded-full p-3 transition-colors duration-200 dark:hover:bg-gray-800"
			> -->
			<MenuButton
				class="flex items-center justify-center rounded-full p-1 transition-colors duration-200 hover:bg-gray-200 dark:hover:bg-gray-800"
			>
				<!-- <Fa icon={faEllipsisVertical} class="h-5 w-5" aria-hidden="true" /> -->
				<DotsThreeVertical color="currentColor" size={'1.25rem'} weight="bold" />
			</MenuButton>
		</div>

		<Transition
			enter="transition ease-out duration-100"
			enterFrom="transform opacity-0 scale-95"
			enterTo="transform opacity-100 scale-100"
			leave="transition ease-in duration-75"
			leaveFrom="transform opacity-100 scale-100"
			leaveTo="transform opacity-0 scale-95"
		>
			<MenuItems
				class="absolute left-0 z-50 mt-2 w-48 origin-top-left rounded-md bg-white shadow-lg focus:outline-none dark:bg-gray-700 border dark:border-gray-600"
			>
				<div class="flex flex-col space-y-1 py-1.5 ">
					<MenuItem let:active>
						<button
							on:click={handleScan}
							class={`${
								active
									? 'bg-gray-100 dark:bg-gray-600 dark:text-white'
									: 'text-gray-800 dark:text-gray-100'
							} group flex items-center space-x-2 w-full py-1 px-2 text-sm transition-colors duration-100`}
						>
							<ArrowsClockwise size={'1rem'} />
							<span>Scan</span>
						</button>
					</MenuItem>

					<MenuItem let:active>
						<button
							class={`${
								active
									? 'bg-gray-100 dark:bg-gray-600 dark:text-white'
									: 'text-gray-800 dark:text-gray-100'
							} group flex items-center space-x-2 w-full py-1 px-2 text-sm transition-colors duration-100`}
						>
							<NotePencil size={'1rem'} />
							<span>Edit</span>
						</button>
					</MenuItem>

					<!-- TODO: divider -->

					<div class="w-full border-t border-gray-300 dark:border-gray-600" />

					<MenuItem let:active>
						<button
							on:click={handleDelete}
							class={`${
								active
									? 'bg-gray-100 dark:bg-gray-600 dark:text-white'
									: 'text-gray-800 dark:text-gray-100'
							} group flex items-center space-x-2 w-full py-1 px-2 text-sm transition-colors duration-100`}
						>
							<Trash size={'1rem'} />
							<span>Delete</span>
						</button>
					</MenuItem>
				</div></MenuItems
			>
		</Transition>
	</Menu>
</div>
