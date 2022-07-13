import React, { useEffect, useMemo } from 'react';
import {
	Checkbox,
	HStack,
	Modal,
	ModalBody,
	ModalContent,
	ModalFooter,
	ModalHeader,
	ModalOverlay,
	Spacer,
	Stack,
	Text,
	useBoolean,
	useDisclosure,
} from '@chakra-ui/react';
import { ArrowLeft, Folder, FolderNotch } from 'phosphor-react';
import { useDirectoryListing } from '~hooks/useDirectoryListing';
import Button, { ModalCloseButton } from './ui/Button';
import Input from './ui/Input';
import toast from 'react-hot-toast';

interface Props {
	startingPath?: string;
	onUpdate(path: string): void;
}

export default function DirectoryPickerModal({ startingPath, onUpdate }: Props) {
	const { isOpen, onOpen, onClose } = useDisclosure();

	const [showHidden, { toggle }] = useBoolean(false);

	const { errorMessage, path, parent, directories, onSelect, goBack } = useDirectoryListing({
		startingPath,
		enabled: isOpen,
	});

	function handleUpdate() {
		if (!errorMessage) {
			onUpdate(path);
			onClose();
		}
	}

	useEffect(() => {
		if (errorMessage) {
			toast.error(errorMessage);
		}
	}, [errorMessage]);

	const directoryList = useMemo(() => {
		if (showHidden) {
			return directories;
		}

		return directories.filter((d) => !d.name.startsWith('.'));
	}, [directories, showHidden]);

	return (
		<>
			<Folder onClick={onOpen} />

			<Modal size="xl" isOpen={isOpen} onClose={onClose}>
				<ModalOverlay />
				<ModalContent>
					<ModalHeader>Select a Directory</ModalHeader>
					<ModalCloseButton />
					<ModalBody className="flex flex-col space-y-2" w="full">
						<HStack>
							<Button
								disabled={!parent}
								onClick={goBack}
								h="37px"
								p={0}
								fontSize="sm"
								rounded="md"
								variant="ghost"
							>
								<ArrowLeft size="1.25rem" />
							</Button>

							<Input
								isInvalid={!!errorMessage}
								value={path}
								// onInputStop={(newPath) => {
								// 	if (newPath) {
								// 		onSelect(newPath);
								// 	}
								// }}
								noOfLines={0}
								p={2}
								rounded="md"
								h="37px"
							/>
						</HStack>

						<Stack
							pt={1}
							spacing={1}
							px={1}
							className="scrollbar-hide"
							h="20rem"
							overflowY="scroll"
						>
							{directoryList.map((directory) => (
								<Button
									key={directory.path}
									justifyContent="flex-start"
									py={2}
									px={1}
									variant="ghost"
									onClick={() => onSelect(directory.path)}
								>
									<HStack align="center">
										<FolderNotch weight="fill" size="1.25rem" /> <Text>{directory.name}</Text>
									</HStack>
								</Button>
							))}
						</Stack>
					</ModalBody>

					<ModalFooter>
						<Checkbox colorScheme="brand" checked={showHidden} onChange={toggle}>
							Show Hidden Directories
						</Checkbox>
						<Spacer />
						<Button mr={3} onClick={onClose}>
							Cancel
						</Button>
						<Button
							disabled={!!errorMessage}
							title="Select the current directory"
							colorScheme="brand"
							onClick={handleUpdate}
						>
							Choose
						</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</>
	);
}
