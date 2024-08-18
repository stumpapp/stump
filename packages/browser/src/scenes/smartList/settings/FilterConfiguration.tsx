import { Accordion, Alert, Heading, Text } from '@stump/components'
import { Construction } from 'lucide-react'
import React from 'react'

import { useSmartListContext } from '../context'

export default function FilterConfiguration() {
	const {
		list: { filters },
	} = useSmartListContext()

	return (
		<div className="flex flex-col gap-y-6">
			<div>
				<Heading size="md">Configuration</Heading>
				<Text variant="muted" size="sm">
					Change the filters, sorting, and other settings for this smart list
				</Text>
			</div>

			<Accordion type="single" collapsible>
				<Accordion.Item value="raw_filters" className="border-none">
					<Accordion.Trigger noUnderline asLabel>
						Raw filters
					</Accordion.Trigger>
					<Accordion.Content className="rounded-sm bg-background-surface p-4">
						<pre className="text-xs text-foreground-subtle">{JSON.stringify(filters, null, 2)}</pre>
					</Accordion.Content>
				</Accordion.Item>
			</Accordion>

			<Alert level="warning" icon={Construction} rounded="sm" alignIcon="start">
				<Alert.Content>
					<span>
						Editing the configured filters is not yet implemented. To update your filters, please
						use the Stump API directly
					</span>
				</Alert.Content>
			</Alert>
		</div>
	)
}
