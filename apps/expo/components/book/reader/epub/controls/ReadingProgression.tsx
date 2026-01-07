import { CardRow } from '~/components/ui'
import { Picker } from '~/components/ui/picker/picker'
import type { PickerOption } from '~/components/ui/picker/types'
import { ReadingDirection } from '~/modules/readium'
import { useReaderStore } from '~/stores'

const READING_DIRECTION_OPTIONS: PickerOption<ReadingDirection>[] = [
	{ label: 'Left to Right', value: 'ltr' },
	{ label: 'Right to Left', value: 'rtl' },
]

export default function ReadingProgression() {
	const store = useReaderStore((state) => ({
		readingDirection: state.globalSettings.readingDirection ?? 'ltr',
		setSettings: state.setGlobalSettings,
	}))

	return (
		<CardRow label="Reading Direction">
			<Picker
				value={store.readingDirection}
				// @ts-expect-error PickerOption type mismatch
				options={READING_DIRECTION_OPTIONS}
				onValueChange={(value) => store.setSettings({ readingDirection: value })}
			/>
		</CardRow>
	)
}
