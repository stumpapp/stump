import { CardRow } from '~/components/ui'
import { Picker } from '~/components/ui/picker/picker'
import type { PickerOption } from '~/components/ui/picker/types'
import { ImageFilter as ImageFilterType } from '~/modules/readium'
import { useReaderStore } from '~/stores'

const IMAGE_FILTER_OPTIONS: PickerOption[] = [
	{ label: 'None', value: 'none' },
	{ label: 'Darken', value: 'darken' },
	{ label: 'Invert', value: 'invert' },
]

export default function ImageFilter() {
	const store = useReaderStore((state) => ({
		imageFilter: state.globalSettings.imageFilter,
		setSettings: state.setGlobalSettings,
	}))

	const handleChange = (value: string) => {
		const imageFilter = value === 'none' ? undefined : (value as ImageFilterType)
		store.setSettings({ imageFilter })
	}

	return (
		<CardRow label="Image Filter">
			<Picker
				value={store.imageFilter ?? 'none'}
				options={IMAGE_FILTER_OPTIONS}
				onValueChange={handleChange}
			/>
		</CardRow>
	)
}
