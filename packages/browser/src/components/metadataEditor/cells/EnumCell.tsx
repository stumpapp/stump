import { NativeSelect } from '@stump/components'
import { useFormContext } from 'react-hook-form'

import { useMetadataEditorContext } from '../context'
import TextCell from './TextCell'

type Props<Field, Value> = {
	binding: Field
	value?: Value | null
	options: Array<{ label: string; value: Value }>
}

export default function EnumCell<Field extends string, Value extends string>({
	binding,
	value,
	options,
}: Props<Field, Value>) {
	const form = useFormContext()

	const { isEditing } = useMetadataEditorContext()

	if (isEditing) {
		return (
			<NativeSelect
				className="sm:max-w-xs"
				{...form.register(binding)}
				value={value ?? ''}
				options={withEmptyOptions(options, value)}
			/>
		)
	}

	return <TextCell binding={binding} value={value} />
}

const withEmptyOptions = <T,>(options: Array<{ label: string; value: T }>, currentValue: unknown) =>
	ensurePresentEvenInvalid([{ label: '--', value: null as T }, ...options], currentValue)

const ensurePresentEvenInvalid = <T,>(
	options: Array<{ label: string; value: T }>,
	currentValue: unknown,
) => {
	if (!currentValue) return options
	if (!options.some((option) => option.value === currentValue)) {
		options.push({ label: String(currentValue), value: currentValue as T })
	}
	return options
}
