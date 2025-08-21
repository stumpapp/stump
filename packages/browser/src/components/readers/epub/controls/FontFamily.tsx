import { Label, NativeSelect } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { isSupportedFont } from '@stump/sdk'
import { useCallback } from 'react'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'
import { SUPPORTED_FONT_OPTIONS } from '@/scenes/settings/app/preferences/FontSelect'

import { useEpubReaderContext } from '../context'

export default function FontFamily() {
	const { t } = useLocaleContext()
	const {
		readerMeta: { bookEntity },
	} = useEpubReaderContext()
	const {
		bookPreferences: { fontFamily },
		setBookPreferences,
	} = useBookPreferences({ book: bookEntity })

	const changeFont = useCallback(
		(font: string) => {
			if (!font) {
				setBookPreferences({ fontFamily: undefined })
			} else if (isSupportedFont(font)) {
				// Note: useApplyTheme will apply the font to the body element after the preferences are updated
				setBookPreferences({ fontFamily: font })
			}
		},
		[setBookPreferences],
	)

	return (
		<div className="py-1.5">
			<Label htmlFor="font-family">{t(getKey('fontFamily.label'))}</Label>
			<NativeSelect
				id="font-family"
				size="sm"
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
