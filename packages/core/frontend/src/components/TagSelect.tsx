import React, { Suspense, useState } from 'react';
import { TagOption, useTags } from '~hooks/useTags';
import { ActionMeta, CreatableSelect, MultiValue, OnChangeValue } from 'chakra-react-select';
import { FormControl, FormHelperText, FormLabel } from '@chakra-ui/react';

interface TagSelectProps {
	preSelectedTags?: Tag[];
	hint?: string;
}

// FIXME: https://github.com/csandman/chakra-react-select/issues/134
export default function TagSelect({ preSelectedTags, hint }: TagSelectProps) {
	const { tags, isLoading } = useTags();

	const [selectedTags, setSelectedTags] = useState<TagOption[]>(
		preSelectedTags ? tagsToOptions(preSelectedTags) : [],
	);

	// tags to be created
	const [newTags, setNewTags] = useState([] as TagOption[]);

	// tags to be removed from the entity
	// const [removedTags, setRemovedTags] = useState([] as TagOption[]);

	function handleCreateTag(value: string) {
		setNewTags((curr) => [...curr, { label: value, value }]);
		// setSelectedTags((curr) => [...curr, { label: value, value }]);
	}

	function tagsToOptions(toConvert: Tag[]): TagOption[] {
		return toConvert.map((t) => ({ label: t.name, value: t.name }));
	}

	function handleChange(newValue: MultiValue<TagOption>, actionMeta: ActionMeta<TagOption>) {
		// console.group('Value Changed');
		// console.log(newValue);
		// console.log(`action: ${actionMeta.action}`);

		if (actionMeta.action === 'remove-value') {
			// TODO: add to removedTags?
			// might not need to do this, might let for submit handle this.
		}

		setSelectedTags(newValue as TagOption[]);
	}

	return (
		<FormControl>
			<FormLabel htmlFor="tags" mb={hint ? 1 : 2}>
				Tags
			</FormLabel>
			{hint && (
				<FormHelperText mt={0} mb={2}>
					{hint}
				</FormHelperText>
			)}
			<CreatableSelect<TagOption, true>
				className="chakra-react-select"
				classNamePrefix="chakra-react-select"
				isLoading={isLoading}
				isMulti
				name="tags"
				onChange={handleChange}
				value={selectedTags}
				options={tags.concat(newTags)}
				placeholder="Select tags"
				closeMenuOnSelect={false}
				menuIsOpen
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
		</FormControl>
	);
}
