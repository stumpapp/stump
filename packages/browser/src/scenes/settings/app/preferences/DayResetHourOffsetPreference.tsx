import { Input, NewCard } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import type { ChangeEvent } from 'react'
import { useCallback } from 'react'

import { usePreferences } from '@/hooks'

const MIN_OFFSET = -23
const MAX_OFFSET = 23

export default function DayResetHourOffsetPreference() {
	const { t } = useLocaleContext()
	const {
		preferences: { dayResetHourOffset },
		update,
	} = usePreferences()

	const handleChange = useCallback(
		async (e: ChangeEvent<HTMLInputElement>) => {
			const nextValue = parseInt(e.target.value, 10)

			if (isNaN(nextValue) || nextValue === dayResetHourOffset) {
				return
			}

			if (nextValue < MIN_OFFSET || nextValue > MAX_OFFSET) {
				return
			}

			try {
				await update({ dayResetHourOffset: nextValue })
			} catch (error) {
				console.error(error)
			}
		},
		[dayResetHourOffset, update],
	)

	return (
		<NewCard.Row label={t(getKey('label'))} description={t(getKey('description'))}>
			<div className="lg:w-32 max-w-xs w-full">
				<Input
					id="dayResetHourOffset"
					value={dayResetHourOffset ?? 0}
					onChange={handleChange}
					type="number"
					min={MIN_OFFSET}
					max={MAX_OFFSET}
					step={1}
				/>
			</div>
		</NewCard.Row>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.dayResetHourOffset'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
