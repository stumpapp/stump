import { WideSwitch } from '@stump/components'
import { useCallback } from 'react'

import { usePreferences } from '@/hooks/usePreferences'

export default function EnableAlphabetFiltering() {
	const {
		preferences: { enableAlphabetSelect },
		update,
	} = usePreferences()

	const handleChange = useCallback(() => {
		update({
			enableAlphabetSelect: !enableAlphabetSelect,
		})
	}, [enableAlphabetSelect, update])

	return (
		<WideSwitch
			formId="enableAlphabetSelect"
			label="Alphabet filtering"
			description="Show an alphabet filter when applicable"
			checked={enableAlphabetSelect}
			onCheckedChange={handleChange}
		/>
	)
}
