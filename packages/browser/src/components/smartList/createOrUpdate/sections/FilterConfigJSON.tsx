import { Accordion, Preformatted, Text } from '@stump/components'
import { useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { FilterGroupSchema, intoAPIFilters, SmartListFormSchema } from '../schema'

export default function FilterConfigJSON() {
	const form = useFormContext<SmartListFormSchema>()
	const { filters } = useWatch({ control: form.control })

	const [joiner] = form.watch(['filters.joiner'])

	const groups = useMemo(() => (filters?.groups ?? []) as FilterGroupSchema[], [filters?.groups])
	const apiFilters = useMemo(
		() =>
			intoAPIFilters({
				groups,
				joiner,
			}),
		[groups, joiner],
	)

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
				<Accordion.Content>
					<Preformatted content={apiFilters} />
				</Accordion.Content>
			</Accordion.Item>
		</Accordion>
	)
}
