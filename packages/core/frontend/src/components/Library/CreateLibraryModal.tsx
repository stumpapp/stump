import React from 'react';
import { Folder } from 'phosphor-react';
import { FieldValues, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useMutation } from 'react-query';
import { z } from 'zod';
import client from '~api/client';
import { createLibrary } from '~api/mutation/library';
import Button from '~components/ui/Button';
import Form from '~components/ui/Form';
import Input from '~components/ui/Input';
import {
	FormControl,
	FormLabel,
	InputGroup,
	InputRightElement,
	Modal,
	ModalBody,
	ModalCloseButton,
	ModalContent,
	ModalFooter,
	ModalHeader,
	ModalOverlay,
	Textarea,
	useDisclosure,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';

export default function CreateLibraryModal() {
	const { isOpen, onOpen, onClose } = useDisclosure();

	function handleCreate() {
		toast.error('Not implemented');
	}

	// TODO: add check for existing library name? server WILL handle that error, but why
	// not have client check too.
	const schema = z.object({
		name: z.string().min(1, { message: 'Library name is required' }),
		path: z.string().min(1, { message: 'Library path is required' }),
		description: z.string().nullable(),
	});

	const form = useForm({
		resolver: zodResolver(schema),
	});

	const { isLoading, mutateAsync } = useMutation('createLibrary', {
		mutationFn: createLibrary,
		onSuccess: (res) => {
			if (!res.data) {
				// throw new Error('Something went wrong.');
				// TODO: log?
			} else {
				client.invalidateQueries('getLibraries');
			}
		},
		onError: (err) => {
			// TODO: handle this error
			// toast.error('Login failed. Please try again.');
			console.error(err);
		},
	});

	async function handleSubmit(values: FieldValues) {
		const { name, path, description } = values;

		toast.promise(mutateAsync({ name, path, description }), {
			loading: 'Creating library...',
			success: 'Library created!',
			error: 'Something went wrong.',
		});
	}

	return (
		<>
			<Button
				variant="outline"
				key="CreateLibraryModalTrigger"
				w="full"
				rounded="md"
				size="sm"
				color={{ _dark: 'gray.200', _light: 'gray.600' }}
				_hover={{
					color: 'gray.900',
					bg: 'gray.50',
					_dark: { bg: 'gray.700', color: 'gray.100' },
				}}
				fontSize="sm"
				fontWeight={'medium'}
				onClick={onOpen}
			>
				Add new library
			</Button>

			<Modal size="xl" isOpen={isOpen} onClose={onClose}>
				<ModalOverlay />
				<ModalContent>
					<ModalHeader>Add new library</ModalHeader>
					<ModalCloseButton />
					<ModalBody className="flex flex-col space-y-2">
						<Form id="create-library-form" form={form} onSubmit={handleSubmit}>
							<FormControl>
								<FormLabel htmlFor="name">Libary name</FormLabel>
								<Input type="text" autoFocus {...form.register('name')} />
							</FormControl>

							<FormControl>
								<FormLabel htmlFor="name">Libary path</FormLabel>
								<InputGroup>
									<Input {...form.register('path')} />
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
								<Textarea autoFocus {...form.register('description')} />
							</FormControl>
						</Form>
					</ModalBody>

					<ModalFooter>
						<Button mr={3} onClick={onClose}>
							Cancel
						</Button>
						<Button
							isLoading={isLoading}
							colorScheme="brand"
							type="submit"
							form="create-library-form"
						>
							Create
						</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</>
	);
}
