import { useLibraryMutation, useTags } from '@stump/client'
import { Helmet } from 'react-helmet'

import LibraryModalForm from '../../components/library/form/LibraryModalForm'
import { useAppContext } from '../../context'

export default function CreateLibrary() {
	const { isServerOwner } = useAppContext()

	if (!isServerOwner) {
		throw new Error('You do not have permission to create libraries.')
	}

	const { tags, options, isLoading: fetchingTags, createTagsAsync: tryCreateTags } = useTags()

	const { createIsLoading, createLibraryAsync: createLibrary } = useLibraryMutation({
		onCreateFailed(res) {
			// toast.error('Failed to create library.')
			console.error(res)
		},
		onError(err) {
			// toast.error('Failed to create library.')
			console.error(err)
		},
	})

	const handleSubmit = async (values: any) => {
		console.log(values)
	}

	return (
		<>
			<Helmet>
				<title>Create Library</title>
			</Helmet>

			<LibraryModalForm tags={options} fetchingTags={fetchingTags} onSubmit={handleSubmit} />
		</>
	)
}

// export default function CreateLibraryModal({ disabled, ...props }: Props) {
// 	const { isOpen, onOpen, onClose } = useDisclosure()

// 	// /Users/aaronleopold/Documents/Stump/Demo
// 	async function handleSubmit(values: FieldValues) {
// 		if (disabled) {
// 			// This is extra protection, should never happen. Making it an error so it is
// 			// easier to find on the chance it does.
// 			throw new Error('You do not have permission to create libraries.')
// 		}

// 		const { name, path, description, tags: formTags, scan_mode, ...library_options } = values

// 		// console.log({ name, path, description, tags: formTags, scan_mode, library_options });

// 		let existingTags = tags.filter((tag) => formTags?.some((t: TagOption) => t.value === tag.name))

// 		const tagsToCreate = formTags
// 			?.map((tag: TagOption) => tag.value)
// 			.filter((tagName: string) => !existingTags.some((t) => t.name === tagName))

// 		if (tagsToCreate && tagsToCreate.length > 0) {
// 			const res: ApiResult<Tag[]> = await tryCreateTags(tagsToCreate)

// 			if (res.status > 201) {
// 				toast.error('Something went wrong when creating the tags.')
// 				return
// 			}

// 			existingTags = existingTags.concat(res.data)
// 		}

// 		toast.promise(
// 			createLibrary({
// 				description,
// 				library_options: library_options as LibraryOptions,
// 				name,
// 				path,
// 				scan_mode,
// 				tags: existingTags,
// 			}),
// 			{
// 				error: 'Something went wrong.',
// 				loading: 'Creating library...',
// 				success: 'Library created!',
// 			},
// 		)
// 	}

// 	function handleOpen() {
// 		if (!disabled) {
// 			onOpen()
// 		}
// 	}

// 	return (
// 		<>
// 			{props.trigger ? (
// 				<props.trigger onClick={handleOpen} />
// 			) : (
// 				<Button className="w-full" variant="outline" pressEffect={false} onClick={handleOpen}>
// 					Create Library
// 				</Button>
// 			)}

// 			<Modal
// 				isCentered
// 				size={{ base: 'sm', sm: 'xl' }}
// 				isOpen={disabled ? false : isOpen}
// 				onClose={onClose}
// 			>
// 				<ModalOverlay />
// 				<ModalContent>
// 					<ModalHeader>Create Library</ModalHeader>
// 					<ModalCloseButton />
// 					<ModalBody w="full" px={{ base: 0, md: 6 }}>
// 						<LibraryModalForm
// 							tags={options}
// 							fetchingTags={fetchingTags}
// 							onSubmit={handleSubmit}
// 							reset={!isOpen}
// 						/>
// 					</ModalBody>

// 					<ModalFooter>
// 						<Button mr={3} onClick={onClose} w={{ base: 'full', md: 'auto' }}>
// 							Cancel
// 						</Button>
// 						<Button
// 							isLoading={createIsLoading}
// 							colorScheme="brand"
// 							type="submit"
// 							form="create-library-form"
// 							w={{ base: 'full', md: 'auto' }}
// 						>
// 							Create
// 						</Button>
// 					</ModalFooter>
// 				</ModalContent>
// 			</Modal>
// 		</>
// 	)
// }
