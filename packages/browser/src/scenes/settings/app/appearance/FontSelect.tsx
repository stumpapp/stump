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
		async (font?: string) => {
			if (font && isSupportedFont(font)) {
				// Note: useApplyTheme will apply the font to the body element after the preferences are updated
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
			<ComboBox
				value={app_font || 'inter'}
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

const localeKey = 'settingsScene.app/appearance.sections.fontSelect'

export const SUPPORTED_FONT_OPTIONS = [
	{
		label: 'Atkinson Hyperlegible',
		value: 'atkinsonhyperlegible',
		className: 'font-atkinsonhyperlegible',
	},
	{
		label: 'Bitter',
		value: 'bitter',
		className: 'font-bitter',
	},
	{
		label: 'Charis SIL',
		value: 'charis',
		className: 'font-charis',
	},
	{
		label: 'Inter',
		value: 'inter',
		className: 'font-inter',
	},
	{
		label: 'Libre Baskerville',
		value: 'librebaskerville',
		className: 'font-librebaskerville',
	},
	{
		label: 'Literata',
		value: 'literata',
		className: 'font-literata',
	},
	{
		label: 'Nunito',
		value: 'nunito',
		className: 'font-nunito',
	},
	{
		label: 'OpenDyslexic',
		value: 'opendyslexic',
		className: 'font-opendyslexic',
	},
]
