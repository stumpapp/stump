import { Accordion, Text } from '@stump/components'
import React, { useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { FilterGroupSchema, intoAPIFilters, SmartListFormSchema } from '../schema'

export default function FilterConfigJSON() {
	const form = useFormContext<SmartListFormSchema>()
	const { filters } = useWatch({ control: form.control })

	const [joiner] = form.watch(['filters.joiner'])

	const groups = useMemo(() => (filters?.groups ?? []) as FilterGroupSchema[], [filters?.groups])
	// FIXME: this errors lol
	const apiFilters = useMemo(
		() =>
			intoAPIFilters({
				groups,
				joiner: joiner ?? 'AND',
			}),
		[groups, joiner],
	)
	const formattedFilters = useMemo(() => JSON.stringify(apiFilters, null, 2), [apiFilters])

	return (
		<Accordion type="single" collapsible>
			<Accordion.Item value="raw_filters" className="border-none">
				<Accordion.Trigger noUnderline asLabel>
					<div className="flex flex-col items-start gap-y-1">
						<span>Show JSON</span>
						<Text variant="muted" size="sm">
							View the raw JSON representation of the filters
						</Text>
					</div>
				</Accordion.Trigger>
				<Accordion.Content className="rounded-md bg-background-surface p-4">
					<pre className="text-xs text-foreground-subtle">{formattedFilters}</pre>
				</Accordion.Content>
			</Accordion.Item>
		</Accordion>
	)
}
