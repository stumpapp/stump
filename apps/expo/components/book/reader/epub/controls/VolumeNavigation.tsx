import { useShallow } from 'zustand/react/shallow'

import { Card, Switch } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { useReaderStore } from '~/stores'

export default function VolumeNavigation() {
	const { t } = useTranslate()
	const { volumeButtonsNavigate, setGlobalSettings } = useReaderStore(
		useShallow((state) => ({
			volumeButtonsNavigate: state.globalSettings.volumeButtonsNavigate,
			setGlobalSettings: state.setGlobalSettings,
		})),
	)

	return (
		<Card.Row label={t('epubSettings.volumeButtonsNavigate')}>
			<Switch
				variant="brand"
				checked={volumeButtonsNavigate ?? false}
				onCheckedChange={(checked) => setGlobalSettings({ volumeButtonsNavigate: checked })}
			/>
		</Card.Row>
	)
}
