import { Input } from '@stump/components'
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
		<div className="py-1.5 md:max-w-md">
			<Input
				id="readingSessionGracePeriodSecs"
				label={t(getKey('label'))}
				description={t(getKey('description'))}
				value={readingSessionGracePeriodSecs ?? 1800}
				onChange={handleChange}
				type="number"
				min={0}
				step={1}
				variant="primary"
				fullWidth
			/>
		</div>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.readingSessionGracePeriod'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
