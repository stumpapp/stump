import { Input, NewCard } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import type { ChangeEvent } from 'react'
import { useCallback } from 'react'

import { usePreferences } from '@/hooks'

export default function ReadingSessionGracePeriodPreference() {
	const { t } = useLocaleContext()
	const {
		preferences: { readingSessionGracePeriodSecs },
		update,
	} = usePreferences()

	const handleChange = useCallback(
		async (e: ChangeEvent<HTMLInputElement>) => {
			const nextValue = parseInt(e.target.value, 10)

			if (isNaN(nextValue) || nextValue === readingSessionGracePeriodSecs) {
				return
			}

			try {
				await update({ readingSessionGracePeriodSecs: nextValue })
			} catch (error) {
				console.error(error)
			}
		},
		[readingSessionGracePeriodSecs, update],
	)

	return (
		<NewCard.Row label={t(getKey('label'))} description={t(getKey('description'))}>
			<div className="lg:w-40 max-w-xs w-full">
				<Input
					id="readingSessionGracePeriodSecs"
					value={readingSessionGracePeriodSecs ?? 1800}
					onChange={handleChange}
					type="number"
					min={0}
					step={1}
				/>
			</div>
		</NewCard.Row>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.readingSessionGracePeriod'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
