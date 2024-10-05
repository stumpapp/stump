import { CheckBox, DatePicker, Input } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useFormContext } from 'react-hook-form'
import { useMediaMatch } from 'rooks'
import { match } from 'ts-pattern'

import {
	FilterSchema,
	FromOperation,
	isDateField,
	isNumberField,
	SmartListFormSchema,
} from '../../../form/schema'
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

	const changeHandler = (key: 'from' | 'to') => (value?: Date | number) => {
		if (value === undefined) {
			form.resetField(`filters.groups.${groupIdx}.filters.${idx}.value.${key}`)
		} else {
			form.setValue(`filters.groups.${groupIdx}.filters.${idx}.value.${key}`, value)
		}
	}

	const renderValue = () => {
		return match(field)
			.when(isDateField, () => (
				<>
					<DatePicker
						placeholder={t(getKey('from.date'))}
						selected={value?.from as Date}
						onChange={changeHandler('from')}
						className="md:w-52"
						popover={{
							align: isAtLeastMedium ? 'start' : 'center',
						}}
					/>
					<DatePicker
						placeholder={t(getKey('to.date'))}
						selected={value?.to as Date}
						onChange={changeHandler('to')}
						className="md:w-52"
						popover={{
							align: isAtLeastMedium ? 'start' : 'center',
						}}
					/>
				</>
			))
			.when(isNumberField, () => (
				<>
					<Input
						placeholder={t(getKey('from.number'))}
						type="number"
						containerClassName="md:w-52"
					/>
					<Input placeholder={t(getKey('to.number'))} type="number" containerClassName="md:w-52" />
				</>
			))
			.otherwise(() => null)
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
