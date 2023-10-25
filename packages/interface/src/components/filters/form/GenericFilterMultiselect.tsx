import { ComboBox } from '@stump/components'
import React, { useEffect, useState } from 'react'
import { useFormContext } from 'react-hook-form'

type Props = {
	/**
	 * The name of the field in the form.
	 */
	name: string
	/**
	 * The label to display for the combo box.
	 */
	label: string
	options: {
		label: string
		value: string
	}[]
}

/**
 * A component that renders a multiselect combo box for a form field. The options
 * are fetched from the API, based on the queryKey and queryFn props. The ComboBox
 * component does not take in a ref, so a name and label are required to properly
 * update the form context.
 */
export default function GenericFilterMultiselect({ name, label, options }: Props) {
	const form = useFormContext()
	const [value, setValue] = useState<string[] | undefined>(() => form.getValues(name))

	useEffect(() => {
		form.setValue(name, value)
	}, [name, form, value])

	return (
		<ComboBox
			label={label}
			options={options}
			isMultiSelect
			filterable
			value={value}
			onChange={(selected) => {
				setValue(selected)
			}}
			size="full"
		/>
	)
}
