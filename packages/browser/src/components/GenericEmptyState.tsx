import { cn, Heading, Text } from '@stump/components'
import { CircleSlash2 } from 'lucide-react'
import React from 'react'

type Props = {
	title: string
	subtitle?: string
	containerClassName?: string
	contentClassName?: string
	leftAlign?: boolean
}
export default function GenericEmptyState({
	title,
	subtitle,
	containerClassName,
	contentClassName,
	leftAlign,
}: Props) {
	return (
		<div
			className={cn(
				'flex min-h-[150px] flex-col items-center justify-center gap-2',
				{ 'md:items-start md:justify-start': leftAlign },
				containerClassName,
			)}
		>
			<CircleSlash2 className="h-10 w-10 pb-2 pt-1 text-foreground-muted" />
			<div className={cn('text-center', { 'md:text-left': leftAlign }, contentClassName)}>
				<Heading size="sm">{title}</Heading>
				{subtitle && (
					<Text size="sm" variant="muted">
						{subtitle}
					</Text>
				)}
			</div>
		</div>
	)
}
