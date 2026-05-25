import { Label, NativeSelect, Text } from '@stump/components'
import { InterfaceRoundness } from '@stump/graphql'

import { usePreferences } from '@/hooks'

// TODO(i18n): add key/values
export default function InterfaceRoundnessPreference() {
	const {
		preferences: { interfaceRoundness },
		update,
	} = usePreferences()

	const handleChange = async (value: InterfaceRoundness) => {
		if (value === interfaceRoundness) return

		try {
			await update({ interfaceRoundness: value })
		} catch (error) {
			console.error(error)
		}
	}

	return (
		<div className="gap-y-1.5 md:max-w-md flex flex-col">
			<Label htmlFor="interface-roundness" className="mb-1.5">
				Interface roundness
			</Label>
			<Text size="sm" variant="muted">
				Controls how rounded core UI surfaces look (buttons, inputs, cards, menus)
			</Text>
			<NativeSelect
				id="interface-roundness"
				value={interfaceRoundness || InterfaceRoundness.Normal}
				onChange={(e) => handleChange(e.target.value as InterfaceRoundness)}
				options={[
					{ label: 'None', value: InterfaceRoundness.None },
					{ label: 'Normal', value: InterfaceRoundness.Normal },
					{ label: 'Rounded', value: InterfaceRoundness.Rounded },
					{ label: 'Pill', value: InterfaceRoundness.Pill },
				]}
			/>
		</div>
	)
}
