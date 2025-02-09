import { WideSwitch } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback } from 'react'

import { useTauriStore } from '@/stores'

const IS_PRODUCTION = import.meta.env.PROD

export default function BundledServer() {
	const { t } = useLocaleContext()
	const { run_bundled_server, setRunBundledServer } = useTauriStore()

	const handleChange = useCallback(
		() => setRunBundledServer(!run_bundled_server),
		[run_bundled_server, setRunBundledServer],
	)

	return (
		<WideSwitch
			title={IS_PRODUCTION ? t('common.notReady') : undefined}
			label={t(getKey('label'))}
			description={t(getKey('description'))}
			checked={run_bundled_server}
			onCheckedChange={handleChange}
			disabled={IS_PRODUCTION}
		/>
	)
}

const LOCALE_KEY = 'settingsScene.app/desktop.sections.optionalFeatures.bundledServer'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
