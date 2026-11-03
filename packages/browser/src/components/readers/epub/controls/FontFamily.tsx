import { ComboBox, Label } from '@stump/components'
import { isSupportedFont } from '@stump/sdk'
import { useCallback } from 'react'

import { useTranslate } from '@/hooks/useTranslate'
import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'
import { SUPPORTED_FONT_OPTIONS } from '@/scenes/settings/app/preferences/FontSelect'

import { useEpubReaderContext } from '../context'

export default function FontFamily() {
	const { translate } = useTranslate()
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
			} else if (isSupportedFont(font) || isSupportedFont(font.toUpperCase())) {
				// Note: useApplyTheme will apply the font to the body element after the preferences are updated
				setBookPreferences({ fontFamily: font.toUpperCase() })
			}
		},
		[setBookPreferences],
	)

	return (
		<div className="py-1.5">
			<Label htmlFor="font-family">{translate(getKey('label'))}</Label>
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

const LOCAL_BASE = 'shared.epubSettings.typeface'
const getKey = (key: string) => `${LOCAL_BASE}.${key}`
