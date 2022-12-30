import {
	Box,
	FormControl,
	FormHelperText,
	FormLabel,
	HStack,
	Text,
	useColorModeValue,
} from '@chakra-ui/react';
import type { Library, LibraryPattern } from '@stump/client';
import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import Link from '../../../ui/Link';

interface Option {
	label: string;
	value: LibraryPattern;
	description: string;
}

const options: Option[] = [
	{
		label: 'Series Based',
		value: 'SERIES_BASED',
		description: "Creates series from the bottom-most level of the library's directory.",
	},
	{
		label: 'Collection Based',
		value: 'COLLECTION_BASED',
		description: "Creates series from the top-most level of the library's directory",
	},
];

interface LibraryPatternRadioProps {
	library?: Library;
}

// Wow, radio groups with chakra is absolutely terrible. Just another
// reason to switch to tailwind full time.
// TODO: After 0.1.0 is released, I'm going to start working on a new UI.
export function LibraryPatternRadio({ library }: LibraryPatternRadioProps) {
	const form = useFormContext();

	const libraryPattern: LibraryPattern = form.watch('library_pattern');

	const disabled = !!library;

	// TODO: fix zod form, I should not have to do this.
	useEffect(() => {
		if (!libraryPattern) {
			form.setValue('library_pattern', library?.library_options.library_pattern || 'SERIES_BASED');
		}
	}, []);

	return (
		<FormControl
			// isDisabled={!!library}
			title={
				disabled
					? 'You cannot change the pattern of an existing library'
					: 'Select a library pattern'
			}
			mb={1}
		>
			<FormLabel htmlFor="" mb={1}>
				Select a library pattern
			</FormLabel>
			<FormHelperText mt={0} mb={2} className="flex space-x-1" fontSize="xs">
				<span>Not sure which to choose?</span>{' '}
				<a
					className="hover:underline underline-offset-1"
					href="https://stumpapp.dev/guides/libraries#library-patterns"
					target="_blank"
				>
					Click here
				</a>{' '}
				<span>
					to learn more. <i>You cannot change this setting later.</i>
				</span>
			</FormHelperText>
			<input disabled={disabled} type="hidden" {...form.register('library_pattern')} />
			<HStack>
				{options.map(({ label, value, description }) => {
					const isChecked = libraryPattern === value;
					return (
						<Box
							key={value}
							bg={disabled ? 'transparent' : useColorModeValue('whiteAlpha.100', 'blackAlpha.100')}
							borderColor={isChecked ? (disabled ? 'brand.400' : 'brand.500') : 'transparent'}
							borderWidth={1}
							p={4}
							rounded="md"
							w="50%"
							cursor={disabled ? 'not-allowed' : 'pointer'}
							onClick={disabled ? undefined : () => form.setValue('library_pattern', value)}
						>
							<Text
								color={disabled ? useColorModeValue('gray.500', 'gray.300') : undefined}
								fontWeight="medium"
							>
								{label}
							</Text>
							<Text color={useColorModeValue('gray.600', 'gray.400')} fontSize="xs">
								{description}
							</Text>
						</Box>
					);
				})}
			</HStack>
		</FormControl>
	);
}
