import { NewCard, RawSwitch } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

import { useDebugStore } from '@/stores'

const IS_DEVELOPMENT = import.meta.env.DEV

export default function Container() {
	if (!IS_DEVELOPMENT) return null

	return <DebugSettings />
}

// TODO(localization): do it
function DebugSettings() {
	const { t } = useLocaleContext()
	const store = useDebugStore()

	return (
		<NewCard
			tone="debug"
			label={t('settingsUi.debugSettings')}
			description={t('settingsUi.debugDescription')}
		>
			<NewCard.Row
				label={t('settingsUi.queryTools')}
				description={t('settingsUi.queryToolsDescription')}
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
