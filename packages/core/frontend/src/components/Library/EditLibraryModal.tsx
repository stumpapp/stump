import React from 'react';
import {
	Modal,
	ModalOverlay,
	ModalContent,
	ModalHeader,
	ModalFooter,
	ModalBody,
	useDisclosure,
	MenuItem,
} from '@chakra-ui/react';
import Button, { ModalCloseButton } from '~components/ui/Button';
import { NotePencil } from 'phosphor-react';
import toast from 'react-hot-toast';
import { FieldValues } from 'react-hook-form';
import LibraryModalForm from './LibraryModalForm';
import { useTags } from '~hooks/useTags';
import { useMutation } from 'react-query';
import client from '~api/client';
import { editLibrary } from '~api/mutation/library';

interface Props {
	library: Library;
}

// TODO: custom tabs, active state is atrocious
export default function EditLibraryModal({ library }: Props) {
	const { isOpen, onOpen, onClose } = useDisclosure();

	const { tags: tagOptions, isLoading: fetchingTags } = useTags();

	const { isLoading, mutateAsync } = useMutation('editLibrary', {
		mutationFn: editLibrary,
		onSuccess: (res) => {
			if (!res.data) {
				// throw new Error('Something went wrong.');
				// TODO: log?
			} else {
				client.invalidateQueries('getLibraries');
				onClose();
			}
		},
		onError: (err) => {
			// TODO: handle this error
			// toast.error('Login failed. Please try again.');
			console.error(err);
		},
	});

	// const { mutateAsync: tryCreateTags } = useMutation('createTags', {
	// 	mutationFn: createTags,
	// });

	function handleSubmit(values: FieldValues) {
		toast.error("I can't do that yet! 😢");

		// const { name, path, description, tags } = values;

		// TODO: create tags?

		// toast.promise(mutateAsync({ id: library.id, name, path, description }), {
		// 	loading: 'Creating library...',
		// 	success: 'Library created!',
		// 	error: 'Something went wrong.',
		// });
	}

	return (
		<>
			<MenuItem icon={<NotePencil size={'1rem'} />} onClick={onOpen}>
				Edit
			</MenuItem>

			<Modal size="xl" isOpen={isOpen} onClose={onClose}>
				<ModalOverlay />
				<ModalContent>
					<ModalHeader>{library.name}</ModalHeader>
					<ModalCloseButton />
					<ModalBody>
						<LibraryModalForm
							library={library}
							tags={tagOptions}
							fetchingTags={fetchingTags}
							onSubmit={handleSubmit}
							reset={!isOpen}
						/>

						{/* <Form className="w-full" id="create-library-form" form={form} onSubmit={handleEdit}>
							<Tabs isFitted colorScheme="brand" w="full">
								<TabList>
									<Tab>General</Tab>
									<Tab>Options</Tab>
								</TabList>

								<TabPanels>
									<TabPanel className="flex flex-col space-y-2">
										<FormControl>
											<FormLabel htmlFor="name">Libary name</FormLabel>
											<Input
												type="text"
												autoFocus
												defaultValue={library.name}
												{...form.register('name')}
											/>
										</FormControl>

										<FormControl>
											<FormLabel htmlFor="name">Libary path</FormLabel>
											<InputGroup>
												<Input defaultValue={library.path} {...form.register('path')} />
												<InputRightElement
													cursor="pointer"
													onClick={() => {
														toast.error('Not implemented yet, please type the path manually');
													}}
													children={<Folder />}
												/>
											</InputGroup>
										</FormControl>

										<FormControl>
											<FormLabel htmlFor="name">Description</FormLabel>
											<TextArea
												placeholder="A short description of the library (optional)"
												defaultValue={library.description}
												{...form.register('description')}
											/>
										</FormControl>
									</TabPanel>
									<TabPanel>
										<p>TODO: access control options, tags, other stuffs tbd</p>
									</TabPanel>
								</TabPanels>
							</Tabs>
						</Form> */}
					</ModalBody>

					<ModalFooter>
						<Button mr={3} onClick={onClose}>
							Cancel
						</Button>
						<Button
							isLoading={isLoading}
							colorScheme="brand"
							type="submit"
							form="edit-library-form"
						>
							Save Changes
						</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</>
	);
}
