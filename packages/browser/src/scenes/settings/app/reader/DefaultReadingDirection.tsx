import { Label, NativeSelect, Text } from '@stump/components'
import { ReadingDirection } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'

import { useReaderStore } from '@/stores'

export default function DefaultReadingDirection() {
	const { t } = useLocaleContext()
	const { readingDirection, setSettings } = useReaderStore((store) => ({
		readingDirection: store.settings.readingDirection,
		setSettings: store.setSettings,
	}))

	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		if (e.target.value === 'LTR' || e.target.value === 'RTL') {
			setSettings({ readingDirection: e.target.value as ReadingDirection })
		} else {
			console.warn(`Invalid reading direction: ${e.target.value}`)
		}
	}

	return (
		<div className="flex flex-col gap-1.5 py-1.5">
			<Label htmlFor="reading-direction">{t(getKey('label'))}</Label>
			<NativeSelect
				id="reading-direction"
				options={[
					{ label: 'Left to right', value: 'ltr' },
					{ label: 'Right to left', value: 'rtl' },
				]}
				value={readingDirection}
				onChange={handleChange}
				className="mt-1.5"
			/>
			<Text size="xs" variant="muted">
				{t(getKey('description'))}
			</Text>
		</div>
	)
}

const LOCAL_BASE = 'settingsScene.app/reader.sections.universal.sections.readingDirection'
const getKey = (key: string) => `${LOCAL_BASE}.${key}`
