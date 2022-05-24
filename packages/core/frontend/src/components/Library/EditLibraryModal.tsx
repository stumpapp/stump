import React from 'react';
import {
	Modal,
	ModalOverlay,
	ModalContent,
	ModalHeader,
	ModalFooter,
	ModalBody,
	ModalCloseButton,
	useDisclosure,
	MenuItem,
	Tabs,
	TabList,
	Tab,
	TabPanels,
	TabPanel,
	FormControl,
	FormLabel,
	InputGroup,
	InputRightElement,
} from '@chakra-ui/react';
import Button from '~components/ui/Button';
import { Folder, NotePencil } from 'phosphor-react';
import toast from 'react-hot-toast';
import Form from '~components/ui/Form';
import { z } from 'zod';
import Input from '~components/ui/Input';
import TextArea from '~components/ui/TextArea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

interface Props {
	library: Library;
}

// TODO: custom tabs, active state is atrocious
export default function EditLibraryModal({ library }: Props) {
	const { isOpen, onOpen, onClose } = useDisclosure();

	function handleEdit() {
		toast.error("I can't do that yet! 😢");
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
						<Form className="w-full" id="create-library-form" form={form} onSubmit={handleEdit}>
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
						</Form>
					</ModalBody>

					<ModalFooter>
						<Button mr={3} onClick={onClose}>
							Cancel
						</Button>
						<Button colorScheme="brand" onClick={handleEdit}>
							Edit
						</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</>
	);
}
