<script lang="ts">
	import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@rgossiaux/svelte-headlessui';
	import Fa from 'svelte-fa';
	import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
	import api, { baseUrl } from '@lib/api';

	export let library: Library;

	async function scanLibrary() {
		// watch for logs
		const res = await api.library.scanLibrary(library.id);

		console.log(res);
	}

	async function deleteLibrary() {
		const res = await fetch(`${baseUrl}/api/library/${library.id}`, {
			method: 'DELETE'
		});

		if (!res.ok) {
			// TODO: handle me
			console.error(await res.text());
		}
	}
</script>

<div class="">
	<Menu as="div" class="relative inline-block text-left">
		<div>
			<MenuButton
				class="w-7 h-7 p-3 flex items-center justify-center dark:hover:bg-gray-800 rounded-full transition-colors duration-200"
			>
				<Fa icon={faEllipsisVertical} class="w-5 h-5" aria-hidden="true" />
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
				class="z-50 absolute left-0 w-32 mt-2 origin-top-left bg-white dark:bg-gray-700 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
			>
				<div class="p-1 flex flex-col space-y-1">
					<MenuItem let:active>
						<button
							class={`${
								active ? 'bg-gray-800 text-white' : 'text-gray-900 dark:text-gray-100'
							} group flex rounded-md items-center w-full p-1 text-sm`}
						>
							Scan
						</button>
					</MenuItem>

					<MenuItem let:active>
						<button
							class={`${
								active ? 'bg-gray-800 text-white' : 'text-gray-900 dark:text-gray-100'
							} group flex rounded-md items-center w-full p-1 text-sm`}
						>
							Edit
						</button>
					</MenuItem>

					<MenuItem let:active>
						<button
							class={`${
								active ? 'bg-red-500 text-white' : 'text-gray-900 dark:text-gray-100'
							} group flex rounded-md items-center w-full p-1 text-sm`}
						>
							Delete
						</button>
					</MenuItem>
				</div></MenuItems
			>
		</Transition>
	</Menu>
</div>
