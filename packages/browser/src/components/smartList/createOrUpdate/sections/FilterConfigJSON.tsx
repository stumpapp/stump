import { Accordion, Preformatted, Text } from '@stump/components'
import { useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { useTranslate } from '@/hooks/useTranslate'

import { FilterGroupSchema, intoAPIFilters, SmartListFormSchema } from '../schema'

export default function FilterConfigJSON() {
	const form = useFormContext<SmartListFormSchema>()
	const { t } = useTranslate()
	const { filters } = useWatch({ control: form.control })

	const [joiner] = useWatch({ control: form.control, name: ['filters.joiner'] })

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
					<div className="gap-y-1 flex flex-col items-start">
						<span>{t('createOrUpdateSmartListForm.rawFilters.show')}</span>
						<Text variant="muted" size="sm">
							{t('createOrUpdateSmartListForm.rawFilters.description')}
						</Text>
					</div>
				</Accordion.Trigger>
				<Accordion.Content>
					<div className="max-h-[50vh] overflow-y-auto overflow-x-auto rounded-md border border-border bg-muted/30 p-2">
						<Preformatted content={apiFilters} />
					</div>
				</Accordion.Content>
			</Accordion.Item>
		</Accordion>
	)
}
