import { NewCard, RawSwitch } from '@stump/components'

import { useTranslate } from '@/hooks/useTranslate'
import { useDebugStore } from '@/stores'

const IS_DEVELOPMENT = import.meta.env.DEV

export default function Container() {
	if (!IS_DEVELOPMENT) return null

	return <DebugSettings />
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.debugSettings'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`

function DebugSettings() {
	const { t } = useTranslate()
	const store = useDebugStore()

	return (
		<NewCard tone="debug" label={t(getKey('label'))} description={t(getKey('description'))}>
			<NewCard.Row
				label={t(getKey('queryTools.label'))}
				description={t(getKey('queryTools.description'))}
				onClick={() => store.patch({ showQueryTools: !store.showQueryTools })}
			>
				<RawSwitch
					id="showQueryTools"
					className="data-[state=checked]:bg-debug/70 data-[state=unchecked]:bg-debug/30"
					checked={store.showQueryTools}
					onCheckedChange={(checked) => store.patch({ showQueryTools: checked })}
				/>
			</NewCard.Row>
		</NewCard>
	)
}
