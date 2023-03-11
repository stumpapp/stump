import {
	Badge,
	Box,
	Heading,
	HStack,
	Input,
	InputGroup,
	InputLeftElement,
	InputRightElement,
	Modal,
	ModalBody,
	ModalContent,
	ModalOverlay,
	Spinner,
	Stack,
	Text,
	useBoolean,
	useColorModeValue,
	VStack,
} from '@chakra-ui/react'
import type { FileStatus } from '@stump/types'
import { MagnifyingGlass } from 'phosphor-react'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useHotkeys } from 'react-hotkeys-hook'
import { useDebounce } from 'rooks'

import FileStatusBadge from './FileStatusBadge'

const fakeResults = [
	{
		description:
			'A witcher is a monster hunter who has been trained from birth to hunt and kill monsters. The witchers are a solitary group, and they are feared by the monsters they hunt.',
		href: '/books/1',
		id: '1622643048696-883eafe4d8dc',
		status: 'READY',
		tags: [
			{ id: 'fjkd', name: 'fantasy' },
			{ id: 'fjkdd', name: 'adventure' },
		],
		title: 'The Witcher',
	},
	{
		description:
			'Easily the best fantasy world ever written, The Lord of the Rings revolves around high adventure, undertaken by a group of companions on a perilous journey to save their world from the evil of Sauron. It is a story of friendship, courage, duty, loyalty, love, sacrifice, and the triumph of good over evil.',
		href: '/books/2',
		id: '1600637453426-7c64826b19d9',
		status: 'READY',
		tags: [
			{ id: 'fjkd', name: 'fantasy' },
			{ id: 'fjkdd', name: 'adventure' },
			{ id: 'fjkdde', name: 'epic' },
		],
		title: 'Lord of the Rings: The Fellowship of the Ring',
	},
	{
		description:
			'The Hobbit is a fantasy novel by English author J.R.R. Tolkien. It was published on 21 September 1937 to wide critical acclaim, being nominated for the Carnegie Medal and awarded a prize from the New York Herald Tribune for best juvenile fiction.',
		href: '/books/3',
		id: '1597350289957-120f34437361',
		status: 'READY',
		tags: [
			{ id: 'fjkd', name: 'fantasy' },
			{ id: 'fjkdd', name: 'adventure' },
		],
		title: 'The Hobbit',
	},
]

export default function CommandPalette() {
	const inputRef = useRef<HTMLInputElement>(null)

	const [open, { on, off }] = useBoolean(false)
	const [results, setResults] = useState<typeof fakeResults>()
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		if (open) {
			toast.error("I don't support search yet, check back soon!")
		}

		return () => {
			setResults(undefined)
		}
	}, [open])

	useHotkeys('ctrl+k, cmd+k', (e) => {
		e.preventDefault()
		// TODO: only use cmd+k on mac, ctrl+k on windows, etc.
		on()
		inputRef.current?.focus()
	})

	async function handleSearch() {
		setLoading(true)

		setTimeout(() => {
			setLoading(false)
			setResults(fakeResults)
		}, 800)
	}

	const onInputStop = useDebounce(handleSearch, 500)

	return (
		<Modal isOpen={open} onClose={off} size={{ base: 'lg', lg: '2xl', md: 'xl' }}>
			<ModalOverlay />

			<ModalContent>
				<ModalBody p={0}>
					<Box>
						<InputGroup py={0.5}>
							<InputLeftElement pointerEvents="none">
								<MagnifyingGlass />
							</InputLeftElement>
							<Input
								onChange={onInputStop}
								ref={inputRef}
								variant="unstyled"
								placeholder="Search"
								py={1.5}
								rounded="none"
								borderBottom="1px"
								borderColor={useColorModeValue('gray.400', 'gray.600')}
							/>
							{loading && (
								<InputRightElement pointerEvents="none">
									<Spinner speed="0.5s" size="sm" />
								</InputRightElement>
							)}
						</InputGroup>
					</Box>
					<HStack px={2} py={0.5} h="full" align="start">
						<QueryResults results={results} />
					</HStack>
				</ModalBody>
			</ModalContent>
		</Modal>
	)
}

const fakeBaseUrl = 'https://images.unsplash.com/photo-'
function QueryResults({ results }: { results?: typeof fakeResults }) {
	const [selected, setSelected] = useState(0)

	const bgColor = useColorModeValue('gray.300', 'gray.600')
	const selectedItemDescriptionColor = useColorModeValue('gray.500', 'gray.450')

	useEffect(
		() => {
			if (selected !== 0) {
				setSelected(0)
			}

			return () => {
				setSelected(0)
			}
		},

		// eslint-disable-next-line react-hooks/exhaustive-deps
		[results],
	)

	if (!results) {
		return null
	}

	if (results.length === 0) {
		return (
			<Box p={2} color="gray.400">
				No results found
			</Box>
		)
	}

	const selectedItem = results[selected]

	return (
		<>
			<Stack
				w="50%"
				p={1.5}
				className="scrollbar-hide"
				minH="52"
				maxH="md"
				overflowY="scroll"
				spacing={1.5}
			>
				{results.map(({ id, title }, i) => (
					<Box
						key={`${id}-${title}-listitem`}
						onClick={() => setSelected(i)}
						className="cursor-pointer rounded-md px-2 py-1"
						bg={selected === i ? bgColor : undefined}
						_hover={{ bg: bgColor }}
					>
						<Text noOfLines={1}>{title}</Text>
					</Box>
				))}
			</Stack>

			{selectedItem && (
				<VStack justify="flex-start" textAlign="center" h="full" w="50%" px={4} pb={4} pt={2}>
					<Heading size="sm">{selectedItem.title}</Heading>
					<img
						src={`${fakeBaseUrl}${selectedItem.id}`}
						className="h-24 w-24 rounded-md object-cover"
					/>
					<Text fontSize="sm" color={selectedItemDescriptionColor} noOfLines={2}>
						{selectedItem.description}
					</Text>

					<HStack>
						<FileStatusBadge status={selectedItem.status as FileStatus} />
						{selectedItem.tags.map(({ id, name }) => (
							<Badge textTransform="none" key={`${id}-${name}-tag`}>
								{name}
							</Badge>
						))}
					</HStack>
				</VStack>
			)}
		</>
	)
}
