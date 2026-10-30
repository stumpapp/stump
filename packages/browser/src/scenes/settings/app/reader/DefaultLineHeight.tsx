import { Input } from '@stump/components'
import React from 'react'
import { useShallow } from 'zustand/react/shallow'

import { useTranslate } from '@/hooks/useTranslate'
import { useReaderStore } from '@/stores'

export default function DefaultLineHeight() {
	const { translate } = useTranslate()
	const {
		settings: { lineHeight },
		setSettings,
	} = useReaderStore(
		useShallow((state) => ({
			setSettings: state.setSettings,
			settings: state.settings,
		})),
	)

	const onValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = parseFloat(e.target.value)
		if (!isNaN(value) && value >= 1.0 && value <= 3.0) {
			setSettings({ lineHeight: value })
		}
	}

	return (
		<div className="py-1.5">
			<Input
				label={translate('shared.epubSettings.lineHeight.label')}
				description={translate('shared.epubSettings.lineHeight.description')}
				value={lineHeight ?? 1.5}
				onChange={onValueChange}
				type="number"
				min={1.0}
				max={3.0}
				step={0.1}
			/>
		</div>
	)
}
