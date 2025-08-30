import { ComboBox, Label, Text } from '@stump/components'
import { SupportedFont } from '@stump/graphql'
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
			if (font && isSupportedFont(font.toUpperCase())) {
				font = font.toUpperCase() as SupportedFont
			}

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
				value={appFont || SupportedFont.Inter}
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
		value: SupportedFont.AtkinsonHyperlegible,
		fontClassName: 'font-atkinsonhyperlegible',
	},
	{
		label: 'Bitter',
		value: SupportedFont.Bitter,
		fontClassName: 'font-bitter',
	},
	{
		label: 'Charis SIL',
		value: SupportedFont.Charis,
		fontClassName: 'font-charis',
	},
	{
		label: 'Inter',
		value: SupportedFont.Inter,
		fontClassName: 'font-inter',
	},
	{
		label: 'Libre Baskerville',
		value: SupportedFont.LibreBaskerville,
		fontClassName: 'font-librebaskerville',
	},
	{
		label: 'Literata',
		value: SupportedFont.Literata,
		fontClassName: 'font-literata',
	},
	{
		label: 'Nunito',
		value: SupportedFont.Nunito,
		fontClassName: 'font-nunito',
	},
	{
		label: 'OpenDyslexic',
		value: SupportedFont.OpenDyslexic,
		fontClassName: 'font-opendyslexic',
	},
]
