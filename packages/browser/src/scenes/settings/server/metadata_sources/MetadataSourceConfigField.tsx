import { Input, Text } from '@stump/components'
import { MetadataSourceSchemaField } from '@stump/sdk'

type Props = {
	value?: string | number
	field: MetadataSourceSchemaField
	onChange: (newValue: string | number) => void
}

export default function MetadataSourceConfigModal({ field, value, onChange }: Props) {
	switch (field.field_type) {
		case 'String':
			return (
				<Input
					label={field.key}
					type="text"
					name={field.key}
					value={value ?? ''}
					onChange={(e) => onChange(e.target.value)}
				/>
			)
		case 'Integer':
			return (
				<Input
					label={field.key}
					type="number"
					name={field.key}
					step={1}
					value={value ?? ''}
					onChange={(e) => onChange(parseInt(e.target.value, 10))}
				/>
			)
		case 'Float':
			return (
				<Input
					label={field.key}
					type="number"
					name={field.key}
					value={value ?? ''}
					onChange={(e) => onChange(parseFloat(e.target.value))}
				/>
			)
		// Fallback for unknown field_type
		default:
			return (
				<Text>
					Unknown type {field.key}: {field.field_type}
				</Text>
			)
	}
}
