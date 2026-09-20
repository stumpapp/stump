import { Badge, cn } from '@stump/components'
import { Minus } from 'lucide-react'
import { useCallback } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { Link } from 'react-router'

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

	const { isEditing, isFieldLocked } = useMetadataEditorContext()

	const locked = isFieldLocked(binding)

	const canEdit = isEditing && !locked

	const valuesFromForm: string[] | undefined | null = useWatch({
		control: form.control,
		name: binding,
	})

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
					key={`${value}-${index}`}
					onClick={canEdit ? undefined : () => onItemClick?.(index)}
					className={cn({
						'cursor-pointer': (onItemClick || !!url) && !canEdit,
					})}
				>
					{value}
				</Badge>
			)

			if (canEdit) {
				return (
					<Badge key={`${value}-${index}`} className="pr-1">
						{value}
						<button
							type="button"
							aria-label={`Remove ${value}`}
							onClick={() => onRemove(index)}
							className="h-4 w-4 inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full opacity-70 hover:opacity-100"
						>
							<Minus className="h-3 w-3" />
						</button>
					</Badge>
				)
			}

			if (url) {
				const Component = url.startsWith('http') ? 'a' : Link
				const props = url.startsWith('http')
					? { href: url, target: '_blank', rel: 'noopener noreferrer' }
					: { to: url }
				return (
					// @ts-expect-error: TS doesn't understand I did this correctly lol
					<Component {...props} key={`${value}-${index}-link-wrapper`}>
						{badge}
					</Component>
				)
			}
			return badge
		},
		[itemUrl, onItemClick, canEdit, onRemove],
	)

	const data = canEdit ? valuesFromForm : values

	return (
		<div className="gap-1.5 flex h-full flex-wrap items-center">
			{data?.map(renderBadge)}

			{canEdit && <AddFieldsDialog binding={binding} onSave={onAppendValues} />}
		</div>
	)
}
