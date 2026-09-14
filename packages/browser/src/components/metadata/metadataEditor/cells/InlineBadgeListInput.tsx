import { Badge, Button, cn } from '@stump/components'
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
			<div key={`${value}-${index}`} className="group relative">
				<Badge>{value}</Badge>
				<Button
					variant="destructive"
					size="icon"
					className="-right-2 -top-2 h-4 w-4 absolute z-10 opacity-0 transition-opacity group-hover:opacity-100"
					aria-label="Remove item"
					onClick={() => onRemove(index)}
				>
					<Minus className="h-3 w-3" />
				</Button>
			</div>
		)
	}

	return (
		<div className={cn('gap-1 flex h-full flex-wrap items-center', className)}>
			{values.map(renderBadge)}
			<AddFieldsDialog binding={binding} onSave={onAppendValues} />
		</div>
	)
}
