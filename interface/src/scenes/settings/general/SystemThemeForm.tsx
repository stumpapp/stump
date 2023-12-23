import { useTheme } from '@stump/client'
import { Divider, Heading, Text } from '@stump/components'

import { useLocaleContext } from '../../../i18n/context'
import SystemThemeSwitch from './SystemThemeSwitch'

export default function SystemThemeForm() {
	const { t } = useLocaleContext()
	const { isDark, toggleTheme } = useTheme()

	return (
		<div className="py-2">
			<Heading size="xs">{t('settingsScene.general.theme.heading')}</Heading>
			<Text size="sm" variant="muted" className="mt-1.5">
				{t('settingsScene.general.theme.subtitle')}
			</Text>

			<Divider variant="muted" className="my-3.5" />

			<div className="flex max-w-2xl flex-col gap-3 divide-y divide-gray-75 dark:divide-gray-900">
				<SystemThemeSwitch
					isChecked={isDark}
					label={t('settingsScene.general.theme.dark.label')}
					description={t('settingsScene.general.theme.dark.description')}
					onChange={toggleTheme}
				/>

				<SystemThemeSwitch
					isChecked={!isDark}
					label={t('settingsScene.general.theme.light.label')}
					description={t('settingsScene.general.theme.light.description')}
					onChange={toggleTheme}
				/>
			</div>
		</div>
	)
}
