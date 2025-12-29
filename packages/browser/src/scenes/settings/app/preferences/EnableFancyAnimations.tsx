import { WideSwitch } from '@stump/components'

import { usePreferences } from '@/hooks/usePreferences'

export default function EnableFancyAnimations() {
	const {
		preferences: { enableFancyAnimations },
		update,
	} = usePreferences()

	const handleChange = () => {
		update({
			enableFancyAnimations: !enableFancyAnimations,
		})
	}

	return (
		<WideSwitch
			label="Fancy animations"
			description="A broad opt-in for fancier animations throughout the app"
			checked={enableFancyAnimations}
			onCheckedChange={handleChange}
			formId="enableFancyAnimations"
		/>
	)
}
