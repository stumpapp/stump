import { useShallow } from 'zustand/react/shallow'

import { Card } from '~/components/ui'
import { Picker } from '~/components/ui/picker/picker'
import type { PickerOption } from '~/components/ui/picker/types'
import { useTranslate } from '~/lib/hooks'
import { ImageFilter as ImageFilterType } from '~/modules/readium'
import { useReaderStore } from '~/stores'

export default function ImageFilter() {
	const { t } = useTranslate()
	const store = useReaderStore(
		useShallow((state) => ({
			imageFilter: state.globalSettings.imageFilter,
			setSettings: state.setGlobalSettings,
		})),
	)

	const imageFilterOptions: PickerOption[] = [
		{ label: t(getKey('options.none')), value: 'none' },
		{ label: t(getKey('options.darken')), value: 'darken' },
		{ label: t(getKey('options.invert')), value: 'invert' },
	]

	const handleChange = (value: string) => {
		const imageFilter = value === 'none' ? undefined : (value as ImageFilterType)
		store.setSettings({ imageFilter })
	}

	return (
		<Card.Row label={t(getKey('label'))}>
			<Picker
				value={store.imageFilter ?? 'none'}
				options={imageFilterOptions}
				onValueChange={handleChange}
			/>
		</Card.Row>
	)
}

const LOCALE_BASE = 'epubSettings.imageFilter'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
