import { Button, Input, Text, ToolTip } from '@stump/components'
import { Minus } from 'lucide-react'
import { useFormContext, useWatch } from 'react-hook-form'

import { getBindingValidation } from '../../fieldDefs'
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

	const { isEditing, isFieldLocked } = useMetadataEditorContext()

	const locked = isFieldLocked(binding)

	const rules = getBindingValidation(binding)

	const formValue = useWatch({ control: form.control, name: binding })

	if (isEditing && !locked) {
		return (
			<div className="group gap-2 flex items-center">
				<Input
					type="number"
					step={isDecimal ? 'any' : 1}
					value={formValue ?? ''}
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
