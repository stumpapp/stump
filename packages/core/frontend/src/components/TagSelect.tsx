import React from 'react';
import { TagOption } from '~hooks/useTags';
import { CreatableSelect } from 'chakra-react-select';
import { FormControl, FormHelperText, FormLabel, useColorModeValue } from '@chakra-ui/react';
import { Controller, useFormContext } from 'react-hook-form';

interface TagSelectProps {
	name?: string;
	label?: string;
	options: TagOption[];
	defaultValue?: TagOption[];
	isLoading?: boolean;
	hint?: string;
}

// FIXME: https://github.com/csandman/chakra-react-select/issues/134
// issue above affecting the theme
export default function TagSelect({
	name = 'tags',
	label = 'Tags',
	options,
	defaultValue,
	isLoading,
	hint,
}: TagSelectProps) {
	const form = useFormContext();

	return (
		<Controller
			name={name}
			control={form.control}
			rules={{ required: false }}
			render={({
				field: { onChange, onBlur, value, name: htmlFor, ref },
				fieldState: { error },
			}) => (
				<FormControl>
					<FormLabel htmlFor={htmlFor} mb={hint ? 1 : 2}>
						{label}
					</FormLabel>
					{hint && (
						<FormHelperText mt={0} mb={2}>
							{hint}
						</FormHelperText>
					)}
					<CreatableSelect<TagOption, true>
						ref={ref}
						className="chakra-react-select"
						classNamePrefix="chakra-react-select"
						isLoading={isLoading}
						isMulti
						name="tags"
						onChange={onChange}
						onBlur={onBlur}
						defaultValue={defaultValue}
						value={value}
						options={options}
						placeholder="Select tags"
						closeMenuOnSelect={false}
						// menuIsOpen
						chakraStyles={{
							control: (provided) => ({
								...provided,
								_focus: {
									boxShadow: '0 0 0 2px rgba(196, 130, 89, 0.6);',
								},
								_hover: {
									borderColor: useColorModeValue('blackAlpha.200', 'whiteAlpha.400'),
								},
							}),
							dropdownIndicator: (provided) => ({
								...provided,
								bg: 'transparent',
								px: 2,
								cursor: 'inherit',
							}),
							indicatorSeparator: (provided) => ({
								...provided,
								display: 'none',
							}),
							menuList: (provided) => ({
								...provided,
								bg: useColorModeValue('white', 'gray.700'),
							}),
							option: (provided, state) => ({
								...provided,
								bg: state.isFocused
									? useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
									: 'transparent',
							}),
							multiValue: (provided) => ({
								...provided,
								color: useColorModeValue('black', 'gray.100'),
								shadow: 'sm',
								bg: useColorModeValue('blackAlpha.100', 'whiteAlpha.100'),
								_hover: {
									bg: useColorModeValue('blackAlpha.200', 'whiteAlpha.200'),
								},
							}),
						}}
					/>

					{error && error.message}
				</FormControl>
			)}
		/>
	);
}
