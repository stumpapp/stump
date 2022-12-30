import { MagnifyingGlass } from 'phosphor-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useHotkeys } from 'react-hotkeys-hook';
import { useDebounce } from 'rooks';

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
} from '@chakra-ui/react';
import type { FileStatus } from '@stump/client';

import FileStatusBadge from './FileStatusBadge';

const fakeResults = [
	{
		id: '1622643048696-883eafe4d8dc',
		title: 'The Witcher',
		description:
			'A witcher is a monster hunter who has been trained from birth to hunt and kill monsters. The witchers are a solitary group, and they are feared by the monsters they hunt.',
		href: '/books/1',
		status: 'READY',
		tags: [
			{ id: 'fjkd', name: 'fantasy' },
			{ id: 'fjkdd', name: 'adventure' },
		],
	},
	{
		id: '1600637453426-7c64826b19d9',
		title: 'Lord of the Rings: The Fellowship of the Ring',
		description:
			'Easily the best fantasy world ever written, The Lord of the Rings revolves around high adventure, undertaken by a group of companions on a perilous journey to save their world from the evil of Sauron. It is a story of friendship, courage, duty, loyalty, love, sacrifice, and the triumph of good over evil.',
		href: '/books/2',
		status: 'READY',
		tags: [
			{ id: 'fjkd', name: 'fantasy' },
			{ id: 'fjkdd', name: 'adventure' },
			{ id: 'fjkdde', name: 'epic' },
		],
	},
	{
		id: '1597350289957-120f34437361',
		title: 'The Hobbit',
		description:
			'The Hobbit is a fantasy novel by English author J.R.R. Tolkien. It was published on 21 September 1937 to wide critical acclaim, being nominated for the Carnegie Medal and awarded a prize from the New York Herald Tribune for best juvenile fiction.',
		href: '/books/3',
		status: 'READY',
		tags: [
			{ id: 'fjkd', name: 'fantasy' },
			{ id: 'fjkdd', name: 'adventure' },
		],
	},
];

export default function CommandPalette() {
	const inputRef = useRef<HTMLInputElement>(null);

	const [open, { on, off }] = useBoolean(false);
	const [results, setResults] = useState<typeof fakeResults>();
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (open) {
			toast.error("I don't support search yet, check back soon!");
		}

		return () => {
			setResults(undefined);
		};
	}, [open]);

	useHotkeys('ctrl+k, cmd+k', (e, _hotKeyEvent) => {
		e.preventDefault();
		// TODO: only use cmd+k on mac, ctrl+k on windows, etc.
		on();
		inputRef.current?.focus();
	});

	async function handleSearch() {
		setLoading(true);

		setTimeout(() => {
			setLoading(false);
			setResults(fakeResults);
		}, 800);
	}

	const onInputStop = useDebounce(handleSearch, 500);

	return (
		<Modal isOpen={open} onClose={off} size={{ base: 'lg', md: 'xl', lg: '2xl' }}>
			<ModalOverlay />

			<ModalContent>
				<ModalBody p={0}>
					<Box>
						<InputGroup py={0.5}>
							<InputLeftElement pointerEvents="none" children={<MagnifyingGlass />} />
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
								<InputRightElement
									pointerEvents="none"
									children={<Spinner speed="0.5s" size="sm" />}
								/>
							)}
						</InputGroup>
					</Box>
					<HStack px={2} py={0.5} h="full" align="start">
						<QueryResults results={results} />
					</HStack>
				</ModalBody>
			</ModalContent>
		</Modal>
	);
}

const fakeBaseUrl = 'https://images.unsplash.com/photo-';
function QueryResults({ results }: { results?: typeof fakeResults }) {
	const [selected, setSelected] = useState(0);

	useEffect(() => {
		if (selected !== 0) {
			setSelected(0);
		}

		return () => {
			setSelected(0);
		};
	}, [results]);

	if (!results) {
		return null;
	}

	if (results.length === 0) {
		return (
			<Box p={2} color="gray.400">
				No results found
			</Box>
		);
	}

	const selectedItem = results[selected];

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
						className="px-2 py-1 cursor-pointer rounded-md"
						bg={selected === i ? useColorModeValue('gray.300', 'gray.600') : undefined}
						_hover={{ bg: useColorModeValue('gray.300', 'gray.600') }}
					>
						<Text noOfLines={1}>{title}</Text>
					</Box>
				))}
			</Stack>

			<VStack justify="flex-start" textAlign="center" h="full" w="50%" px={4} pb={4} pt={2}>
				<Heading size="sm">{selectedItem.title}</Heading>
				<img
					src={`${fakeBaseUrl}${selectedItem.id}`}
					className="w-24 h-24 object-cover rounded-md"
				/>
				<Text fontSize="sm" color={useColorModeValue('gray.500', 'gray.450')} noOfLines={2}>
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
		</>
	);
}
