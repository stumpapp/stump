import React, { useState } from 'react';
import { TagOption } from '~hooks/useTags';
import { CreatableSelect } from 'chakra-react-select';
import { FormControl, FormHelperText, FormLabel } from '@chakra-ui/react';
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

	// tags to be created
	const [newTags, setNewTags] = useState([] as TagOption[]);

	function handleCreateTag(value: string) {
		setNewTags((curr) => [...curr, { label: value, value }]);
	}

	return (
		<Controller
			name={name}
			control={form.control}
			rules={{ required: false }}
			render={({ field: { onChange, onBlur, value, name, ref }, fieldState: { error } }) => (
				<FormControl>
					<FormLabel htmlFor={name} mb={hint ? 1 : 2}>
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
						onChange={(newValue, actionMeta) => {
							if (actionMeta.action === 'remove-value') {
								const newTag = newTags.find((t) => t.value === actionMeta.removedValue.value);

								if (newTag) {
									setNewTags(newTags.filter((t) => t !== newTag));
								}
							}

							onChange(newValue as TagOption[]);
						}}
						onBlur={onBlur}
						defaultValue={defaultValue}
						value={value}
						options={options.concat(newTags)}
						placeholder="Select tags"
						closeMenuOnSelect={false}
						// menuIsOpen
						onCreateOption={handleCreateTag}
						chakraStyles={{
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
						}}
					/>

					{error && error.message}
				</FormControl>
			)}
		/>
	);
}
