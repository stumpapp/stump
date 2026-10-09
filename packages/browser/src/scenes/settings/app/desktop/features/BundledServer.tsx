import { NewCard, RawSwitch } from '@stump/components'
import { useCallback } from 'react'

import { useTranslate } from '@/hooks/useTranslate'
import { useTauriStore } from '@/stores'

export default function BundledServer() {
	const { t } = useTranslate()
	const { runBundledServer, setRunBundledServer } = useTauriStore()

	const handleChange = useCallback(
		() => setRunBundledServer(!runBundledServer),
		[runBundledServer, setRunBundledServer],
	)

	return (
		<NewCard.Row label={t(getKey('label'))} description={t(getKey('description'))}>
			<RawSwitch checked={runBundledServer} onCheckedChange={handleChange} />
		</NewCard.Row>
	)
}

const LOCALE_KEY = 'settingsScene.app/desktop.sections.optionalFeatures.bundledServer'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
