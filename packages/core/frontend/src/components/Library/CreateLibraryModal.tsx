import React, { useRef } from 'react';
import { FieldValues, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useMutation } from 'react-query';
import { z } from 'zod';
import client from '~api/client';
import { createLibrary } from '~api/mutation/library';
import Button, { ModalCloseButton } from '~components/ui/Button';
import Form from '~components/ui/Form';
import Input from '~components/ui/Input';
import {
	FormControl,
	FormLabel,
	InputGroup,
	InputRightElement,
	Modal,
	ModalBody,
	ModalContent,
	ModalFooter,
	ModalHeader,
	ModalOverlay,
	TabList,
	TabPanel,
	TabPanels,
	Tabs,
	useDisclosure,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import TextArea from '~components/ui/TextArea';
import { Tab } from '~components/ui/Tabs';
import FileSystemModal from '~components/FileSystemModal';

interface Props {
	trigger?: (props: any) => JSX.Element;
}

export default function CreateLibraryModal(props: Props) {
	const { isOpen, onOpen, onClose } = useDisclosure();

	const inputRef = useRef<HTMLInputElement>(null);

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
				onClose();
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
			{props.trigger ? (
				<props.trigger onClick={onOpen} />
			) : (
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
			)}

			<Modal size="xl" isOpen={isOpen} onClose={onClose}>
				<ModalOverlay />
				<ModalContent>
					<ModalHeader>Add new library</ModalHeader>
					<ModalCloseButton />
					<ModalBody w="full">
						<Form className="w-full" id="create-library-form" form={form} onSubmit={handleSubmit}>
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
												placeholder="My Library"
												autoFocus
												{...form.register('name')}
											/>
										</FormControl>

										{/* <input className="hidden" type="file" directory="" webkitdirectory="" /> */}

										<FormControl>
											<FormLabel htmlFor="name">Libary path</FormLabel>
											<InputGroup>
												<Input placeholder="/path/to/library" {...form.register('path')} />
												<InputRightElement cursor="pointer" children={<FileSystemModal />} />
											</InputGroup>
										</FormControl>

										<FormControl>
											<FormLabel htmlFor="name">Description</FormLabel>
											<TextArea
												placeholder="A short description of the library (optional)"
												{...form.register('description')}
											/>
										</FormControl>
									</TabPanel>
									<TabPanel>
										<p>TODO: access control options, tags, other stuffs tbd</p>
										{/* https://github.com/csandman/chakra-react-select */}
									</TabPanel>
								</TabPanels>
							</Tabs>
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
