import { Label, NativeSelect, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { isSupportedFont } from '@stump/types'
import React, { useCallback } from 'react'

import { usePreferences } from '@/hooks/usePreferences'

/**
 * A component that allows the user to select the font for the app from a list of
 * supported fonts
 */
export default function FontSelect() {
	const { t } = useLocaleContext()
	const {
		preferences: { app_font },
		update,
	} = usePreferences()

	/**
	 * A callback that changes the font of the app to the provided font, if it is one of the
	 * supported fonts
	 *
	 * TODO(383): support custom fonts
	 */
	const changeFont = useCallback(
		async (font: string) => {
			if (isSupportedFont(font)) {
				const body = document.querySelector('body')
				// Find and then any font-related classes from the body
				const fontClasses = Array.from(body?.classList ?? []).filter((c) => c.startsWith('font-'))
				body?.classList.remove(...fontClasses)
				// Add the target font class to the body
				body?.classList.add(`font-${font}`)
				try {
					await update({ app_font: font })
				} catch (e) {
					console.error('Failed to persist font preference', e)
				}
			}
		},
		[update],
	)

	return (
		<div className="flex flex-col gap-y-1.5 md:max-w-md">
			<Label htmlFor="extension" className="mb-1.5">
				{t(`${localeKey}.label`)}
			</Label>
			{/* TODO: don't use a native select, instead some combobox which renders each option in the font */}
			<NativeSelect
				value={app_font || 'inter'}
				options={[
					{ label: 'Inter', value: 'inter' },
					{ label: 'OpenDyslexic', value: 'opendyslexic' },
				]}
				onChange={(e) => changeFont(e.target.value)}
			/>
			<Text variant="muted" size="xs">
				{t(`${localeKey}.description`)}
			</Text>
		</div>
	)
}

const localeKey = 'settingsScene.app/appearance.sections.fontSelect'
