import { CheckBox, DatePicker, Input } from '@stump/components'
import { useMediaMatch } from 'rooks'
import { match } from 'ts-pattern'

import { FilterSchema, isDateField, isNumberField } from '../../form/newSchema'

type Props = {
	def: FilterSchema
}

export default function RangeValue({ def: { field, value } }: Props) {
	const isAtLeastMedium = useMediaMatch('(min-width: 768px)')

	const renderValue = () => {
		return match(field)
			.when(isDateField, () => (
				<>
					<DatePicker
						placeholder="From date"
						onChange={(date) => console.log(date)}
						className="md:w-52"
						popover={{
							align: isAtLeastMedium ? 'start' : 'center',
						}}
					/>
					<DatePicker
						placeholder="To date"
						onChange={(date) => console.log(date)}
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
			<CheckBox id="inclusive" label="Inclusive" variant="primary" />
		</>
	)
}
