import { ReadingDirection } from '@stump/graphql'
import { useShallow } from 'zustand/react/shallow'

import { Card } from '~/components/ui'
import { Picker } from '~/components/ui/picker/picker'
import type { PickerOption } from '~/components/ui/picker/types'
import { useTranslate } from '~/lib/hooks'
import { useReaderStore } from '~/stores'

export default function ReadingProgression() {
	const { translate } = useTranslate()
	const store = useReaderStore(
		useShallow((state) => ({
			readingDirection: state.globalSettings.readingDirection ?? 'LTR',
			setSettings: state.setGlobalSettings,
		})),
	)

	const readingDirectionOptions: PickerOption<ReadingDirection>[] = [
		{ label: translate(getKey('options.LTR')), value: ReadingDirection.Ltr },
		{ label: translate(getKey('options.RTL')), value: ReadingDirection.Rtl },
	]

	return (
		<Card.Row label={translate(getKey('label'))}>
			<Picker
				value={store.readingDirection}
				options={readingDirectionOptions}
				onValueChange={(value) => store.setSettings({ readingDirection: value })}
			/>
		</Card.Row>
	)
}

const LOCALE_BASE = 'shared.readerSettings.readingDirection'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
