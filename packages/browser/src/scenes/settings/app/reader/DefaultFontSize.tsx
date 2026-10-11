import { Input } from '@stump/components'
import React from 'react'
import { useShallow } from 'zustand/react/shallow'

import { useTranslate } from '@/hooks/useTranslate'
import { useReaderStore } from '@/stores'

export default function DefaultFontSize() {
	const { translate } = useTranslate()
	const {
		settings: { fontSize },
		setSettings,
	} = useReaderStore(
		useShallow((state) => ({
			setSettings: state.setSettings,
			settings: state.settings,
		})),
	)

	const onValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = parseInt(e.target.value)
		if (!isNaN(value) && value > 0) {
			setSettings({ fontSize: value })
		}
	}

	return (
		<div className="py-1.5">
			<Input
				label={translate('shared.epubSettings.fontSize.label')}
				description={translate('shared.epubSettings.fontSize.description')}
				value={fontSize ?? 13}
				onChange={onValueChange}
				type="number"
				min={0}
			/>
		</div>
	)
}
