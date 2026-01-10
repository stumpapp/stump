import { Input } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React from 'react'

import { useReaderStore } from '@/stores'

export default function DefaultLineHeight() {
	const { t } = useLocaleContext()
	const {
		settings: { lineHeight },
		setSettings,
	} = useReaderStore((state) => ({
		setSettings: state.setSettings,
		settings: state.settings,
	}))

	const onValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = parseFloat(e.target.value)
		if (!isNaN(value) && value >= 1.0 && value <= 3.0) {
			setSettings({ lineHeight: value })
		}
	}

	return (
		<div className="py-1.5">
			<Input
				label={t(getKey('lineHeight.label'))}
				description={t(getKey('lineHeight.description'))}
				value={lineHeight ?? 1.5}
				onChange={onValueChange}
				type="number"
				min={1.0}
				max={3.0}
				step={0.1}
				variant="primary"
			/>
		</div>
	)
}

const LOCAL_BASE = 'settingsScene.app/reader.sections.textBasedBooks.sections'
const getKey = (key: string) => `${LOCAL_BASE}.${key}`
