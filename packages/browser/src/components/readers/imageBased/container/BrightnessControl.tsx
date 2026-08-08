import { Label, Slider } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback, useMemo } from 'react'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useImageBaseReaderContext } from '../context'

export default function BrightnessControl() {
	const { t } = useLocaleContext()
	const { book } = useImageBaseReaderContext()
	const {
		bookPreferences: { brightness },
		setBookPreferences,
	} = useBookPreferences({ book })

	const handleChange = useCallback(
		(value?: number) => {
			if (value === undefined || isNaN(value)) return
			// Do not allow effectively 0 brightness
			if (value < 0.1) {
				value = 0.1
			}
			setBookPreferences({ brightness: value })
		},
		[setBookPreferences],
	)

	const value = useMemo(() => (isNaN(brightness) ? 1 : brightness), [brightness])

	return (
		<div className="space-y-2 py-1.5 flex flex-col">
			<Label>{t('readerUi.brightness.label')}</Label>
			<Slider
				value={[value]}
				step={0.01}
				max={1}
				onValueChange={([dragValue]) => handleChange(dragValue)}
			/>
		</div>
	)
}
