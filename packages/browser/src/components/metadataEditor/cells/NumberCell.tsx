import { Input, Text } from '@stump/components'
import { useMemo } from 'react'
import { useFormContext } from 'react-hook-form'

import { useMetadataEditorContext } from '../context'

type Props<Field> = {
	binding: Field
	value?: number | null
}

export default function NumberCell<Field extends string>({ binding, value }: Props<Field>) {
	const form = useFormContext()

	const { isEditing } = useMetadataEditorContext()

	const rules = useMemo(() => validationRules[binding as keyof typeof validationRules], [binding])

	if (isEditing) {
		return (
			<Input
				type="number"
				defaultValue={value ?? ''}
				className="font-mono text-sm md:w-1/3"
				size="sm"
				min={rules?.min}
				max={rules?.max}
				onChange={(e) => {
					const value = e.target.value
					// @ts-expect-error: TS is really complex for this generic form
					form.setValue(binding, value ? Number(value) : null)
				}}
			/>
		)
	}

	return <Text className="font-mono text-sm">{value}</Text>
}

const validationRules = {
	ageRating: {
		min: 0,
		max: undefined,
	},
	day: {
		min: 1,
		max: 31,
	},
	month: {
		min: 1,
		max: 12,
	},
	pageCount: {
		min: 1,
		max: undefined,
	},
	volume: {
		min: 1,
		max: undefined,
	},
	year: {
		min: 1900,
		max: new Date().getFullYear(),
	},
}
