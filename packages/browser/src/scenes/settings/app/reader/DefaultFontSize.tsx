import { Input } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React from 'react'

import { useReaderStore } from '@/stores'

export default function DefaultFontSize() {
	const { t } = useLocaleContext()
	const {
		settings: { fontSize },
		setSettings,
	} = useReaderStore((state) => ({
		setSettings: state.setSettings,
		settings: state.settings,
	}))

	const onValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = parseInt(e.target.value)
		if (!isNaN(value) && value > 0) {
			setSettings({ fontSize: value })
		}
	}

	return (
		<div className="py-1.5">
			<Input
				label={t(getKey('fontSize.label'))}
				description={t(getKey('fontSize.description'))}
				value={fontSize ?? 13}
				onChange={onValueChange}
				type="number"
				min={0}
				variant="primary"
			/>
		</div>
	)
}

const LOCAL_BASE = 'settingsScene.app/reader.sections.textBasedBooks.sections'
const getKey = (key: string) => `${LOCAL_BASE}.${key}`
