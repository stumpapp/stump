import { Button, Input, Text, ToolTip } from '@stump/components'
import { Minus } from 'lucide-react'
import { useMemo } from 'react'
import { useFormContext } from 'react-hook-form'

import { useMetadataEditorContext } from '../context'

type Props<Field> = {
	binding: Field
	value?: number | null
	isDecimal?: boolean
}

export default function NumberCell<Field extends string>({
	binding,
	value,
	isDecimal,
}: Props<Field>) {
	const form = useFormContext()

	const { isEditing } = useMetadataEditorContext()

	const rules = useMemo(() => validationRules[binding as keyof typeof validationRules], [binding])

	if (isEditing) {
		return (
			<div className="group flex items-center gap-2">
				<Input
					type="number"
					step={isDecimal ? 'any' : 1}
					defaultValue={value ?? ''}
					className="font-mono text-sm"
					containerClassName="md:w-[unset]"
					size="sm"
					min={rules?.min}
					max={rules?.max}
					onChange={(e) => {
						const value = e.target.value
						// @ts-expect-error: TS is really complex for this generic form
						form.setValue(binding, value ? Number(value) : null)
					}}
				/>

				<ToolTip content="Reset field">
					<Button
						variant="danger"
						size="icon"
						className="h-4 w-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
						aria-label="Reset field"
						// @ts-expect-error: Null is fine to reset it here. form.resetField didn't quite work as expected
						onClick={() => form.setValue(binding, null)}
					>
						<Minus className="h-3 w-3" />
					</Button>
				</ToolTip>
			</div>
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
