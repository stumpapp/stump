import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'
import { useEpubReaderContext } from '../context'
import { Label, NativeSelect } from '@stump/components'
import { SUPPORTED_FONT_OPTIONS } from '@/scenes/settings/app/appearance/FontSelect'
import { useCallback } from 'react'
import { isSupportedFont } from '@stump/sdk'

export default function FontFamily() {
	const {
		readerMeta: { bookEntity },
	} = useEpubReaderContext()
	const {
		bookPreferences: { fontFamily },
		setBookPreferences,
	} = useBookPreferences({ book: bookEntity })

	const changeFont = useCallback(
		(font: string) => {
			if (isSupportedFont(font)) {
				console.log('font', font)
				// Note: useApplyTheme will apply the font to the body element after the preferences are updated
				setBookPreferences({ fontFamily: font })
			}
		},
		[setBookPreferences],
	)

	return (
		<div className="py-1.5">
			<Label htmlFor="font-family">Font family</Label>
			<NativeSelect
				id="font-family"
				size="sm"
				options={SUPPORTED_FONT_OPTIONS}
				value={fontFamily}
				onChange={(e) => changeFont(e.target.value)}
				className="mt-1.5"
			/>
		</div>
	)
}
