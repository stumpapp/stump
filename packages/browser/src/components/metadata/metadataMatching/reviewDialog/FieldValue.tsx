import { Badge, cn, Text, ToolTip } from '@stump/components'

type Props = {
	value: unknown
	highlight?: boolean
	compareWith?: unknown
}

export function FieldValue({ value, highlight, compareWith }: Props) {
	if (value == null || value === '') {
		return (
			<Text size="xs" variant="muted">
				—
			</Text>
		)
	}

	if (Array.isArray(value)) {
		if (value.length === 0) {
			return (
				<Text size="xs" variant="muted">
					—
				</Text>
			)
		}

		const currentSet =
			highlight && Array.isArray(compareWith) ? new Set(compareWith.map(String)) : null

		return (
			<div className="gap-1 flex flex-wrap">
				{value.map((item, i) => {
					const isNew = currentSet != null && !currentSet.has(String(item))
					return (
						<Badge key={i} variant={isNew ? 'primary' : 'default'} size="sm">
							{String(item)}
						</Badge>
					)
				})}
			</div>
		)
	}

	const str = String(value)
	const isTruncatable = str.length > 120

	if (isTruncatable) {
		return (
			<ToolTip content={<div className="max-w-[400px]">{str}</div>}>
				<Text
					size="sm"
					className={cn('line-clamp-2 cursor-help', highlight && 'font-semibold text-brand')}
				>
					{str}
				</Text>
			</ToolTip>
		)
	}

	return (
		<Text size="sm" className={cn(highlight && 'font-semibold text-brand')}>
			{str}
		</Text>
	)
}
