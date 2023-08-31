import { Heading, Text } from '@stump/components'
import { CircleSlash2 } from 'lucide-react'
import React from 'react'

type Props = {
	title: string
	subtitle: string
}
export default function GenericEmptyState({ title, subtitle }: Props) {
	return (
		<div className="flex min-h-[150px] flex-col items-center justify-center gap-2">
			<CircleSlash2 className="h-10 w-10 pb-2 pt-1 dark:text-gray-400" />
			<div className="text-center">
				<Heading size="sm">{title}</Heading>
				<Text size="sm" variant="muted">
					{subtitle}
				</Text>
			</div>
		</div>
	)
}
