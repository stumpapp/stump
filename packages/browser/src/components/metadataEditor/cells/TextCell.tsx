import { cn, Input, Text, TextArea } from '@stump/components'
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
			// @ts-expect-error: TS doesn't know I am doing this correctly lol
			<Component
				defaultValue={value || ''}
				{...extraProps}
				required={false}
				{...form.register(binding)}
			/>
		)
	}

	if (isLong) {
		return <MarkdownText>{value ?? ''}</MarkdownText>
	}

	return <Text className={cn({ 'font-mono text-sm': isMonoText })}>{value}</Text>
}
