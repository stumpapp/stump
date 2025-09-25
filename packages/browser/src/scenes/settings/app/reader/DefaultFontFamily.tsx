import { ComboBox, Label } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { isSupportedFont } from '@stump/sdk'
import { useCallback } from 'react'

import { SUPPORTED_FONT_OPTIONS } from '@/scenes/settings/app/appearance/FontSelect'
import { useReaderStore } from '@/stores'

export default function DefaultFontFamily() {
	const { t } = useLocaleContext()
	const {
		settings: { fontFamily },
		setSettings,
	} = useReaderStore((state) => ({
		setSettings: state.setSettings,
		settings: state.settings,
	}))

	const changeFont = useCallback(
		(font?: string) => {
			if (!font) {
				setSettings({ fontFamily: undefined })
			} else if (isSupportedFont(font)) {
				setSettings({ fontFamily: font })
			}
		},
		[setSettings],
	)

	return (
		<div className="py-1.5">
			<Label htmlFor="font-family">{t(getKey('fontFamily.label'))}</Label>
			<ComboBox
				size="full"
				options={[{ value: '', label: 'Default', fontClassName: '' }].concat(
					SUPPORTED_FONT_OPTIONS,
				)}
				value={fontFamily ?? ''}
				onChange={changeFont}
			/>
		</div>
	)
}

const LOCAL_BASE = 'settingsScene.app/reader.sections.textBasedBooks.sections'
const getKey = (key: string) => `${LOCAL_BASE}.${key}`
