import { Accordion, Heading, Text } from '@stump/components'
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
					<Accordion.Content className="rounded-sm bg-background-200 p-4">
						<pre className="text-xs text-contrast-200">{JSON.stringify(filters, null, 2)}</pre>
					</Accordion.Content>
				</Accordion.Item>
			</Accordion>
		</div>
	)
}
