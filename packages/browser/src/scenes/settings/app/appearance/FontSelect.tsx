import { Label, NativeSelect, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { isSupportedFont } from '@stump/sdk'
import { useCallback } from 'react'

import { usePreferences } from '@/hooks/usePreferences'

/**
 * A component that allows the user to select the font for the app from a list of
 * supported fonts
 */
export default function FontSelect() {
	const { t } = useLocaleContext()
	const {
		preferences: { appFont },
		update,
	} = usePreferences()

	/**
	 * A callback that changes the font of the app to the provided font, if it is one of the
	 * supported fonts
	 *
	 * TODO(383): support custom fonts
	 */
	// TODO(graphql): Fix type
	const changeFont = useCallback(
		async (font: string) => {
			if (isSupportedFont(font)) {
				// Note: useApplyTheme will apply the font to the body element after the preferences are updated
				try {
					await update({ appFont: font })
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
				value={appFont || 'inter'}
				options={SUPPORTED_FONT_OPTIONS}
				onChange={(e) => changeFont(e.target.value)}
			/>
			<Text variant="muted" size="xs">
				{t(`${localeKey}.description`)}
			</Text>
		</div>
	)
}

const localeKey = 'settingsScene.app/appearance.sections.fontSelect'

export const SUPPORTED_FONT_OPTIONS = [
	{ label: 'Atkinson Hyperlegible', value: 'atkinsonhyperlegible' },
	{ label: 'Bitter', value: 'bitter' },
	{ label: 'Charis SIL', value: 'charis' },
	{ label: 'Inter', value: 'inter' },
	{ label: 'Libre Baskerville', value: 'librebaskerville' },
	{ label: 'Literata', value: 'literata' },
	{ label: 'Nunito', value: 'nunito' },
	{ label: 'OpenDyslexic', value: 'opendyslexic' },
]
