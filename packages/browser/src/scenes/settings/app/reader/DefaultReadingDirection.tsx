import { NativeSelect, NewCard } from '@stump/components'
import { ReadingDirection } from '@stump/graphql'
import { useShallow } from 'zustand/react/shallow'

import { useTranslate } from '@/hooks/useTranslate'
import { useReaderStore } from '@/stores'

// TODO: remove this global fallback. the cascading of settings is annoyingly confusing
export default function DefaultReadingDirection() {
	const { translate } = useTranslate()
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
		<NewCard.Row
			label={translate('shared.readerSettings.readingDirection.label')}
			description={translate('shared.readerSettings.readingDirection.description')}
		>
			<div className="max-w-xs lg:w-56 w-full">
				<NativeSelect
					id="reading-direction"
					options={[
						{
							label: translate('shared.readerSettings.readingDirection.options.LTR'),
							value: ReadingDirection.Ltr,
						},
						{
							label: translate('shared.readerSettings.readingDirection.options.RTL'),
							value: ReadingDirection.Rtl,
						},
					]}
					value={readingDirection}
					onChange={handleChange}
				/>
			</div>
		</NewCard.Row>
	)
}
