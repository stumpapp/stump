import { Heading, Text } from '@stump/components'
import { Construction } from 'lucide-react'
import React from 'react'

export default function JobScheduler() {
	return (
		<div className="flex min-h-[150px] flex-col items-center justify-center gap-2">
			<Construction className="h-10 w-10 dark:text-gray-400" />
			<Heading size="sm">Under construction</Heading>
			<Text size="sm" variant="muted">
				This feature is not yet available.
			</Text>
		</div>
	)
}
