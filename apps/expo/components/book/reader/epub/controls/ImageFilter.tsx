import { useShallow } from 'zustand/react/shallow'

import { Card } from '~/components/ui'
import { Picker } from '~/components/ui/picker/picker'
import type { PickerOption } from '~/components/ui/picker/types'
import { useTranslate } from '~/lib/hooks'
import { ImageFilter as ImageFilterType } from '~/modules/readium'
import { useReaderStore } from '~/stores'

export default function ImageFilter() {
	const { translate } = useTranslate()
	const store = useReaderStore(
		useShallow((state) => ({
			imageFilter: state.globalSettings.imageFilter,
			setSettings: state.setGlobalSettings,
		})),
	)

	const imageFilterOptions: PickerOption[] = [
		{ label: translate(getKey('options.none')), value: 'none' },
		{ label: translate(getKey('options.darken')), value: 'darken' },
		{ label: translate(getKey('options.invert')), value: 'invert' },
	]

	const handleChange = (value: string) => {
		const imageFilter = value === 'none' ? undefined : (value as ImageFilterType)
		store.setSettings({ imageFilter })
	}

	return (
		<Card.Row label={translate(getKey('label'))}>
			<Picker
				value={store.imageFilter ?? 'none'}
				options={imageFilterOptions}
				onValueChange={handleChange}
			/>
		</Card.Row>
	)
}

const LOCALE_BASE = 'shared.epubSettings.imageFilter'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
