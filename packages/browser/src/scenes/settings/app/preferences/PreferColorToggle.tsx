import { WideSwitch } from '@stump/components'

// TODO: Implement this
export default function PreferColorToggle() {
	const handleChange = () => {}

	return (
		<WideSwitch
			label="Prefer colors"
			description="Display more of the main accent color instead of monochrome colors"
			checked
			onCheckedChange={handleChange}
			disabled
			formId="prefer_accent_color"
			title="This setting is not currently supported"
		/>
	)
}
