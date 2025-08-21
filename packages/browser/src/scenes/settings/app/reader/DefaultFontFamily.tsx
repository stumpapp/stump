import { Label, NativeSelect } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { isSupportedFont } from '@stump/sdk'
import { useCallback } from 'react'

import { SUPPORTED_FONT_OPTIONS } from '@/scenes/settings/app/preferences/FontSelect'
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
			<NativeSelect
				id="font-family"
				options={[{ value: '', label: 'Default' }].concat(SUPPORTED_FONT_OPTIONS)}
				value={fontFamily ?? ''}
				onChange={(e) => changeFont(e.target.value)}
				className="mt-1.5"
			/>
		</div>
	)
}

const LOCAL_BASE = 'settingsScene.app/reader.sections.textBasedBooks.sections'
const getKey = (key: string) => `${LOCAL_BASE}.${key}`
