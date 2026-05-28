import { ComboBox, NewCard } from '@stump/components'
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
		<NewCard.Row label={t(`${localeKey}.label`)} description={t(`${localeKey}.description`)}>
			<ComboBox
				value={appFont || SupportedFont.Inter}
				options={SUPPORTED_FONT_OPTIONS}
				onChange={changeFont}
				size="sm"
				triggerClassName="w-52 max-w-full border-border bg-card text-foreground hover:bg-muted/40 data-[state=open]:bg-card"
				wrapperClassName="w-52 rounded-md border border-border bg-card text-card-foreground shadow-md"
			/>
		</NewCard.Row>
	)
}

const localeKey = 'settingsScene.app/preferences.sections.fontSelect'

export const SUPPORTED_FONT_OPTIONS = [
	{
		label: 'Atkinson Hyperlegible Next',
		value: SupportedFont.AtkinsonHyperlegibleNext,
		fontClassName: 'font-atkinsonhyperlegiblenext',
	},
	{
		label: 'Bitter',
		value: SupportedFont.Bitter,
		fontClassName: 'font-bitter',
	},
	{
		label: 'Charis',
		value: SupportedFont.Charis,
		fontClassName: 'font-charis',
	},
	{
		label: 'Hina Mincho',
		value: SupportedFont.HinaMincho,
		fontClassName: 'font-hinamincho',
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
