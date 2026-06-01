import { NativeSelect, NewCard } from '@stump/components'
import { ReadingDirection } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useShallow } from 'zustand/react/shallow'

import { useReaderStore } from '@/stores'

// TODO: remove this global fallback. the cascading of settings is annoyingly confusing
export default function DefaultReadingDirection() {
	const { t } = useLocaleContext()
	const { readingDirection, setSettings } = useReaderStore(
		useShallow((store) => ({
			readingDirection: store.settings.readingDirection,
			setSettings: store.setSettings,
		})),
	)

	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		if (e.target.value === 'LTR' || e.target.value === 'RTL') {
			setSettings({ readingDirection: e.target.value as ReadingDirection })
		} else {
			console.warn(`Invalid reading direction: ${e.target.value}`)
		}
	}

	return (
		<NewCard.Row label={t(getKey('label'))} description={t(getKey('description'))}>
			<div className="max-w-xs lg:w-56 w-full">
				<NativeSelect
					id="reading-direction"
					options={[
						{ label: 'Left to right', value: ReadingDirection.Ltr },
						{ label: 'Right to left', value: ReadingDirection.Rtl },
					]}
					value={readingDirection}
					onChange={handleChange}
				/>
			</div>
		</NewCard.Row>
	)
}

const LOCAL_BASE = 'settingsScene.app/reader.sections.universal.sections.readingDirection'
const getKey = (key: string) => `${LOCAL_BASE}.${key}`
