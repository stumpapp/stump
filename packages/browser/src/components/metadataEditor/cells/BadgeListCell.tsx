import { Badge, Button, cn } from '@stump/components'
import { Minus } from 'lucide-react'
import { useCallback } from 'react'
import { useFormContext } from 'react-hook-form'
import { Link } from 'react-router-dom'

import AddFieldsDialog from '../AddFieldsDialog'
import { useMetadataEditorContext } from '../context'

type Props<Field extends string> = {
	binding: Field
	values?: string[]
	onItemClick?: (index: number) => void
	itemUrl?: (index: number) => string | undefined
}

export default function BadgeListCell<Field extends string>({
	binding,
	values,
	onItemClick,
	itemUrl,
}: Props<Field>) {
	const form = useFormContext()

	const { isEditing } = useMetadataEditorContext()

	const valuesFromForm: string[] | undefined | null = form.watch(binding)

	const onRemove = useCallback(
		(index: number) => {
			form.setValue(
				binding,
				// @ts-expect-error: TS is really complicated here
				valuesFromForm?.filter((_, i) => i !== index) as string[],
			)
		},
		[form, binding, valuesFromForm],
	)

	const onAppendValues = useCallback(
		(values: string[]) => {
			// @ts-expect-error: TS is really complicated here
			form.setValue(binding, [...(valuesFromForm ?? []), ...values])
		},
		[form, binding, valuesFromForm],
	)

	const renderBadge = useCallback(
		(value: string, index: number) => {
			const url = itemUrl?.(index)
			const badge = (
				<Badge
					key={value}
					onClick={isEditing ? undefined : () => onItemClick?.(index)}
					className={cn({
						'cursor-pointer': (onItemClick || !!url) && !isEditing,
					})}
				>
					{value}
				</Badge>
			)

			if (isEditing) {
				return (
					<div className="group relative">
						{badge}
						<Button
							variant="danger"
							size="icon"
							className="absolute -right-2 -top-2 z-10 h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
							aria-label="Remove item"
							onClick={() => onRemove(index)}
						>
							<Minus className="h-3 w-3" />
						</Button>
					</div>
				)
			}

			if (url) {
				const Component = url.startsWith('http') ? 'a' : Link
				const props = url.startsWith('http')
					? { href: url, target: '_blank', rel: 'noopener noreferrer' }
					: { to: url }
				return (
					// @ts-expect-error: TS doesn't understand I did this correctly lol
					<Component {...props} key={`${value}-link-wrapper`}>
						{badge}
					</Component>
				)
			}
			return badge
		},
		[itemUrl, onItemClick, isEditing, onRemove],
	)

	const data = isEditing ? valuesFromForm : values

	return (
		<div className="flex h-full flex-wrap items-center gap-1">
			{data?.map(renderBadge)}

			{isEditing && <AddFieldsDialog binding={binding} onSave={onAppendValues} />}
		</div>
	)
}
