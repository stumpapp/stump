// import { FormControl, FormHelperText, FormLabel, SystemStyleObject } from '@chakra-ui/react'
import { TagOption } from '@stump/client'
import { ComboBox } from '@stump/components'
// import { CreatableSelect } from 'chakra-react-select'
import { useFormContext } from 'react-hook-form'

interface TagSelectProps {
	name?: string
	label?: string
	options: TagOption[]
	defaultValue?: TagOption[]
	isLoading?: boolean
	hint?: string
	onCreateTag: (name: string) => Promise<void>
}

// TODO: make this work:
// 1. select tags to update form
// 2. if no tag matches filter, add option to create the tag.
export default function TagSelect({
	name = 'tags',
	label = 'Tags',
	options,
	defaultValue,
	isLoading,
	hint,
}: TagSelectProps) {
	const form = useFormContext()
	return (
		<ComboBox label="Tags (not working)" filterable isMultiSelect options={options} size="lg" />
	)
	/*return (
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
						noOptionsMessage={() =>
							!options.length ? (
								<p>You haven&rsquo;t created any tags yet</p>
							) : (
								<p>Start typing to create a new tag</p>
							)
						}
						closeMenuOnSelect={false}
						focusBorderColor="0 0 0 2px rgba(196, 130, 89, 0.6);"
						// menuIsOpen
						chakraStyles={{
							control: (provided: SystemStyleObject) => ({
								...provided,
								_focus: {
									boxShadow: '0 0 0 2px rgba(196, 130, 89, 0.6);',
								},
							}),
							dropdownIndicator: (provided: SystemStyleObject) => ({
								...provided,
								bg: 'transparent',
								cursor: 'inherit',
								px: 2,
							}),
							indicatorSeparator: (provided: SystemStyleObject) => ({
								...provided,
								display: 'none',
							}),
						}}
					/>

					{error && error.message}
				</FormControl>
			)}
		/>
	)*/
}
