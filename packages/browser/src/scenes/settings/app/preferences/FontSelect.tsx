import { ComboBox, Label, Text } from '@stump/components'
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
	const changeFont = useCallback(
		async (font?: string) => {
			if (font && isSupportedFont(font)) {
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
			<ComboBox
				value={appFont || 'INTER'}
				options={SUPPORTED_FONT_OPTIONS}
				onChange={changeFont}
				size="full"
			/>
			<Text variant="muted" size="xs">
				{t(`${localeKey}.description`)}
			</Text>
		</div>
	)
}

const localeKey = 'settingsScene.app/preferences.sections.fontSelect'

export const SUPPORTED_FONT_OPTIONS = [
	{
		label: 'Atkinson Hyperlegible',
		value: 'ATKINSON_HYPERLEGIBLE',
		fontClassName: 'font-atkinsonhyperlegible',
	},
	{
		label: 'Bitter',
		value: 'BITTER',
		fontClassName: 'font-bitter',
	},
	{
		label: 'Charis SIL',
		value: 'CHARIS',
		fontClassName: 'font-charis',
	},
	{
		label: 'Inter',
		value: 'INTER',
		fontClassName: 'font-inter',
	},
	{
		label: 'Libre Baskerville',
		value: 'LIBRE_BASKERVILLE',
		fontClassName: 'font-librebaskerville',
	},
	{
		label: 'Literata',
		value: 'LITERATA',
		fontClassName: 'font-literata',
	},
	{
		label: 'Nunito',
		value: 'NUNITO',
		fontClassName: 'font-nunito',
	},
	{
		label: 'OpenDyslexic',
		value: 'OPEN_DYSLEXIC',
		fontClassName: 'font-opendyslexic',
	},
]
