import { Button, cn, Input, Text, TextArea, ToolTip } from '@stump/components'
import { Minus } from 'lucide-react'
import { useFormContext } from 'react-hook-form'

import { MarkdownText } from '@/components/markdown'

import { useMetadataEditorContext } from '../context'

type Props<Field> = {
	binding: Field
	value?: string | null
	isLong?: boolean
	isMonoText?: boolean
}

export default function TextCell<Field extends string>({
	binding,
	value,
	isLong,
	isMonoText,
}: Props<Field>) {
	const form = useFormContext()

	const { isEditing } = useMetadataEditorContext()

	if (isEditing) {
		const Component = isLong ? TextArea : Input
		const extraProps = isLong ? {} : { size: 'sm' }
		return (
			<div className="group flex items-center gap-2">
				{/* @ts-expect-error: TS doesn't know I am doing this correctly lol */}
				<Component
					defaultValue={value || ''}
					containerClassName={isLong ? 'flex-1' : undefined}
					{...extraProps}
					required={false}
					{...form.register(binding)}
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

	if (isLong) {
		return <MarkdownText>{value ?? ''}</MarkdownText>
	}

	return <Text className={cn({ 'font-mono text-sm': isMonoText })}>{value}</Text>
}
