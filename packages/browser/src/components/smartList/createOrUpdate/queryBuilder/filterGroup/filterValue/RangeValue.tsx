import { CheckBox, DatePicker, Input } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useFormContext, useFormState } from 'react-hook-form'
import { useMediaMatch } from 'rooks'
import { match } from 'ts-pattern'

import {
	FilterSchema,
	FromOperation,
	isDateField,
	isNumberField,
	SmartListFormSchema,
} from '@/components/smartList/createOrUpdate'

import { useFilterGroupContext } from '../context'

export type RangeFilterDef = FilterSchema & { value: FromOperation }

type Props = {
	def: RangeFilterDef
	idx: number
}

export default function RangeValue({ def: { field, value }, idx }: Props) {
	const form = useFormContext<SmartListFormSchema>()
	const isAtLeastMedium = useMediaMatch('(min-width: 768px)')

	const { t } = useLocaleContext()
	const { groupIdx } = useFilterGroupContext()
	const { errors } = useFormState({ control: form.control })

	const formError = useMemo(
		() => errors.filters?.groups?.[groupIdx]?.filters?.[idx],
		[errors, groupIdx, idx],
	)

	const changeHandler = (key: 'from' | 'to') => (value?: Date | number) => {
		if (value === undefined) {
			form.resetField(`filters.groups.${groupIdx}.filters.${idx}.value.${key}`)
		} else {
			const adjustedValue = typeof value === 'number' ? value : dayjs(value).endOf('day').toDate()
			form.setValue(`filters.groups.${groupIdx}.filters.${idx}.value.${key}`, adjustedValue)
		}
	}

	const renderValue = () => {
		return (
			match(field)
				.when(isDateField, () => (
					<>
						<DatePicker
							placeholder={t(getKey('from.date'))}
							selected={value && value.from ? dayjs(value.from).toDate() : undefined}
							onChange={changeHandler('from')}
							className="md:w-52"
							popover={{
								align: isAtLeastMedium ? 'start' : 'center',
							}}
						/>
						<DatePicker
							placeholder={t(getKey('to.date'))}
							selected={value && value.to ? dayjs(value.to).toDate() : undefined}
							onChange={changeHandler('to')}
							className="md:w-52"
							popover={{
								align: isAtLeastMedium ? 'start' : 'center',
							}}
						/>
					</>
				))
				// TODO(ux): show the error somewhere. The input in error state with message will disalign the container, which is just
				// a bit annoying. Ideally we can render the error message somewhere else without disrupting the layout.
				.when(isNumberField, () => (
					<>
						<Input
							placeholder={t(getKey('from.number'))}
							type="number"
							containerClassName="md:w-52"
							isInvalid={!!formError?.value?.message}
							{...form.register(`filters.groups.${groupIdx}.filters.${idx}.value.from`, {
								valueAsNumber: true,
							})}
						/>
						<Input
							placeholder={t(getKey('to.number'))}
							type="number"
							containerClassName="md:w-52"
							isInvalid={!!formError?.value?.message}
							{...form.register(`filters.groups.${groupIdx}.filters.${idx}.value.to`, {
								valueAsNumber: true,
							})}
						/>
					</>
				))
				.otherwise(() => null)
		)
	}

	return (
		<>
			{renderValue()}
			<CheckBox
				id="inclusive"
				label={t(getKey('inclusive'))}
				variant="primary"
				checked={value?.inclusive}
				onClick={() =>
					form.setValue(
						`filters.groups.${groupIdx}.filters.${idx}.value.inclusive`,
						!value?.inclusive,
					)
				}
			/>
		</>
	)
}

const LOCALE_KEY = 'createOrUpdateSmartListForm.fields.queryBuilder.filters.rangeValue'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
