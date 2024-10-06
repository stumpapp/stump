import { Label, NativeSelect, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React, { useCallback } from 'react'
import { useFormContext } from 'react-hook-form'

import { isGrouping, SmartListFormSchema, SmartListGroupBy } from '../schema'

type Props = {
	disabled?: boolean
}

export default function GroupBy({ disabled }: Props) {
	const form = useFormContext<SmartListFormSchema>()

	const grouping = form.watch('grouping')

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			if (isGrouping(e.target.value)) {
				form.setValue('grouping', e.target.value)
			}
		},
		[form],
	)

	const { t } = useLocaleContext()

	return (
		<div className="flex flex-col space-y-1.5 pb-4">
			<Label>{t(getKey('label'))}</Label>
			<div>
				<NativeSelect
					className="h-8 w-[unset] py-0"
					disabled={disabled}
					options={[
						{
							label: t(getOptionKey('BY_BOOKS', 'label')),
							value: 'BY_BOOKS',
						},
						{
							label: t(getOptionKey('BY_SERIES', 'label')),
							value: 'BY_SERIES',
						},
						{
							label: t(getOptionKey('BY_LIBRARY', 'label')),
							value: 'BY_LIBRARY',
						},
					]}
					value={grouping}
					onChange={handleChange}
				/>
			</div>
			<Text variant="muted" size="sm">
				{t(getKey('description'))}
			</Text>
		</div>
	)
}

const LOCALE_KEY = 'createOrUpdateSmartListForm.fields.queryBuilder.grouping'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
const getOptionKey = (grouping: SmartListGroupBy, key: string) =>
	`${LOCALE_KEY}.options.${grouping.toLowerCase()}.${key}`
