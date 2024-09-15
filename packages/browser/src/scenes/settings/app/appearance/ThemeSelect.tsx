import { Label, Link, NativeSelect, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React from 'react'

import { useTheme } from '@/hooks'

const localeKey = 'settingsScene.app/appearance.sections.themeSelect'

export default function ThemeSelect() {
	const { t } = useLocaleContext()
	const { theme, changeTheme } = useTheme()

	return (
		<div className="flex flex-col gap-y-1.5 md:max-w-md">
			<Label htmlFor="extension" className="mb-1.5">
				{t(`${localeKey}.label`)}
			</Label>
			<NativeSelect
				value={theme}
				options={[
					{ label: t(`${localeKey}.options.light`), value: 'light' },
					{ label: t(`${localeKey}.options.dark`), value: 'dark' },
					{ label: t(`${localeKey}.options.bronze`), value: 'bronze' },
					{ label: t(`${localeKey}.options.ocean`), value: 'ocean' },
					{ label: t(`${localeKey}.options.autumn`), value: 'autumn' },
					{ label: t(`${localeKey}.options.cosmic`), value: 'cosmic' },
				]}
				onChange={(e) => changeTheme(e.target.value)}
			/>
			<Text variant="muted" size="xs">
				{t(`${localeKey}.description`)}. {t(`${localeKey}.customTheme.0`)}{' '}
				<Link href="https://stumpapp.dev/guides/configuration/theming">
					{t(`${localeKey}.customTheme.1`)}
				</Link>
			</Text>
		</div>
	)
}
