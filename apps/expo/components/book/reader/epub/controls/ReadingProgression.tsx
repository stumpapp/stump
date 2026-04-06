import { useShallow } from 'zustand/react/shallow'

import { Card } from '~/components/ui'
import { Picker } from '~/components/ui/picker/picker'
import type { PickerOption } from '~/components/ui/picker/types'
import { useTranslate } from '~/lib/hooks'
import { ReadingDirection } from '~/modules/readium'
import { useReaderStore } from '~/stores'

export default function ReadingProgression() {
	const { t } = useTranslate()
	const store = useReaderStore(
		useShallow((state) => ({
			readingDirection: state.globalSettings.readingDirection ?? 'ltr',
			setSettings: state.setGlobalSettings,
		})),
	)

	const readingDirectionOptions: PickerOption<ReadingDirection>[] = [
		{ label: t(getKey('options.ltr')), value: 'ltr' },
		{ label: t(getKey('options.rtl')), value: 'rtl' },
	]

	return (
		<Card.Row label={t(getKey('label'))}>
			<Picker
				value={store.readingDirection}
				// @ts-expect-error PickerOption type mismatch
				// FIXME: epub settings use 'ltr' and 'rtl'. image reader settings use 'LTR' and 'RTL'
				// causes no text to show up in epub reader if last changed on image reader
				options={readingDirectionOptions}
				onValueChange={(value) => store.setSettings({ readingDirection: value })}
			/>
		</Card.Row>
	)
}

const LOCALE_BASE = 'epubSettings.readingDirection'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
