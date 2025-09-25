import { ComboBox, Label } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { isSupportedFont } from '@stump/sdk'
import { useCallback } from 'react'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'
import { SUPPORTED_FONT_OPTIONS } from '@/scenes/settings/app/appearance/FontSelect'

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
		(font?: string) => {
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
