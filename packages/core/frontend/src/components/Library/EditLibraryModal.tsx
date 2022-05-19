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
} from '@chakra-ui/react';
import Button from '~components/ui/Button';
import { NotePencil } from 'phosphor-react';
import toast from 'react-hot-toast';

interface Props {
	library: Library;
}

// TODO: custom tabs, active state is atrocious
export default function EditLibraryModal({ library }: Props) {
	const { isOpen, onOpen, onClose } = useDisclosure();

	function handleEdit() {
		toast.error("I can't do that yet! 😢");
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
						<Tabs isFitted colorScheme="brand">
							<TabList>
								<Tab>General</Tab>
								<Tab>Options</Tab>
							</TabList>

							<TabPanels>
								<TabPanel>
									<p>one!</p>
								</TabPanel>
								<TabPanel>
									<p>two!</p>
								</TabPanel>
							</TabPanels>
						</Tabs>
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
