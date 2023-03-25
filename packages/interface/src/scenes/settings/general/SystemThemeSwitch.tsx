import { Label, RawSwitch, Text } from '@stump/components'

type Props = {
	isChecked: boolean
	label: string
	description: string
	onChange: () => void
}
export default function SystemThemeSwitch({ label, description, isChecked, onChange }: Props) {
	return (
		<div className="flex items-center justify-between py-6 md:items-start">
			<RawSwitch className="text-gray-900" checked={isChecked} onClick={onChange} primaryRing />

			<div className="flex flex-grow flex-col gap-2 text-right">
				<Label>{label}</Label>
				<Text size="xs" variant="muted">
					{description}
				</Text>
			</div>
		</div>
	)
}
