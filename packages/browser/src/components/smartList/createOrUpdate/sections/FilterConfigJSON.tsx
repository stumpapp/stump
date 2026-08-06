import { Accordion, Preformatted, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { FilterGroupSchema, intoAPIFilters, SmartListFormSchema } from '../schema'

export default function FilterConfigJSON() {
	const { t } = useLocaleContext()
	const form = useFormContext<SmartListFormSchema>()
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
						<span>{t('filterUi.showJson')}</span>
						<Text variant="muted" size="sm">
							{t('filterUi.showJsonDescription')}
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
