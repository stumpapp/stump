import { Badge, cn } from '@stump/components'
import { Minus } from 'lucide-react'

import AddFieldsDialog from '../AddFieldsDialog'

type Props = {
	values: string[]
	onChange: (values: string[]) => void
	className?: string
	binding: string
}

export default function InlineBadgeListInput({ values, onChange, className, binding }: Props) {
	const onRemove = (index: number) => {
		onChange(values.filter((_, i) => i !== index))
	}

	const onAppendValues = (newValues: string[]) => {
		onChange([...values, ...newValues])
	}

	const renderBadge = (value: string, index: number) => {
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

	return (
		<div className={cn('gap-1.5 flex h-full flex-wrap items-center', className)}>
			{values.map(renderBadge)}
			<AddFieldsDialog binding={binding} onSave={onAppendValues} />
		</div>
	)
}
