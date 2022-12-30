import {
	Checkbox,
	Flex,
	HStack,
	Modal,
	ModalBody,
	ModalContent,
	ModalFooter,
	ModalHeader,
	ModalOverlay,
	Stack,
	Text,
	useBoolean,
	useDisclosure,
} from '@chakra-ui/react'
import { useDirectoryListing } from '@stump/client'
import { ArrowLeft, Folder, FolderNotch } from 'phosphor-react'
import { useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'

import Button, { ModalCloseButton } from '../ui/Button'
import Input from '../ui/Input'
import ToolTip from '../ui/ToolTip'

interface Props {
	startingPath?: string
	onUpdate(path: string | null): void
}

export default function DirectoryPickerModal({ startingPath, onUpdate }: Props) {
	const { isOpen, onOpen, onClose } = useDisclosure()

	const [showHidden, { toggle }] = useBoolean(false)

	// FIXME: This component needs to render a *virtual* list AND pass a page param as the user scrolls
	// down the list. I recently tested a directory with 1000+ files and it took a while to load. So,
	// I am paging the results to 100 per page. Might reduce to 50.
	const { errorMessage, path, parent, directories, onSelect, goBack } = useDirectoryListing({
		enabled: isOpen,
		startingPath,
		// TODO: page
	})

	function handleUpdate() {
		if (!errorMessage) {
			onUpdate(path)
			onClose()
		}
	}

	useEffect(() => {
		if (errorMessage) {
			toast.error(errorMessage)
		}
	}, [errorMessage])

	const directoryList = useMemo(() => {
		if (showHidden) {
			return directories
		}

		return directories.filter((d) => !d.name.startsWith('.'))
	}, [directories, showHidden])

	return (
		<>
			<ToolTip label="Select folder">
				<Folder onClick={onOpen} />
			</ToolTip>

			<Modal isCentered size={{ base: 'sm', sm: 'xl' }} isOpen={isOpen} onClose={onClose}>
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
								value={path ?? undefined}
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
						<Flex
							w="full"
							// align={{ base: 'flex-start', sm: 'center' }}
							direction={{ base: 'column', sm: 'row' }}
						>
							<Checkbox
								colorScheme="brand"
								checked={showHidden}
								onChange={toggle}
								mb={{ base: 3, sm: 0 }}
								w="full"
							>
								Show Hidden Directories
							</Checkbox>

							<HStack w="full" justify="flex-end">
								<Button mr={3} onClick={onClose} w={{ base: 'full', md: 'auto' }}>
									Cancel
								</Button>
								<Button
									disabled={!!errorMessage}
									title="Select the current directory"
									colorScheme="brand"
									onClick={handleUpdate}
									w={{ base: 'full', md: 'auto' }}
								>
									Choose
								</Button>
							</HStack>
						</Flex>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</>
	)
}
