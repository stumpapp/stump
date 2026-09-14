import { useShallow } from 'zustand/react/shallow'

import { Card } from '~/components/ui'
import { Picker } from '~/components/ui/picker/picker'
import type { PickerOption } from '~/components/ui/picker/types'
import { useTranslate } from '~/lib/hooks'
import { useReaderStore } from '~/stores'

export default function ColumnCount() {
	const { t } = useTranslate()
	const store = useReaderStore(
		useShallow((state) => ({
			columnCount: state.globalSettings.columnCount ?? 'auto',
			setSettings: state.setGlobalSettings,
		})),
	)

	const columnOptions: PickerOption[] = [
		{ label: t(getKey('options.auto')), value: 'auto' },
		{ label: t(getKey('options.single')), value: '1' },
		{ label: t(getKey('options.double')), value: '2' },
	]

	const handleChange = (value: string) => {
		const columnCount = value === 'auto' ? 'auto' : (parseInt(value, 10) as 1 | 2)
		store.setSettings({ columnCount })
	}

	return (
		<Card.Row label="Columns">
			<Picker
				value={String(store.columnCount)}
				options={columnOptions}
				onValueChange={handleChange}
			/>
		</Card.Row>
	)
}

const LOCALE_BASE = 'epubSettings.columns'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
