import { CheckBox, DatePicker, Input } from '@stump/components'
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
						placeholder="From date"
						selected={value?.from as Date}
						onChange={changeHandler('from')}
						className="md:w-52"
						popover={{
							align: isAtLeastMedium ? 'start' : 'center',
						}}
					/>
					<DatePicker
						placeholder="To date"
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
					<Input placeholder="From" type="number" containerClassName="md:w-52" />
					<Input placeholder="To" type="number" containerClassName="md:w-52" />
				</>
			))
			.otherwise(() => null)
	}

	return (
		<>
			{renderValue()}
			<CheckBox
				id="inclusive"
				label="Inclusive"
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
