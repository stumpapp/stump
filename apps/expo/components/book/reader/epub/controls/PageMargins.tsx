import { useShallow } from 'zustand/react/shallow'

import { Card, Stepper } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { useReaderStore } from '~/stores'

export default function PageMargins() {
	const { t } = useTranslate()
	const store = useReaderStore(
		useShallow((state) => ({
			pageMargins: state.globalSettings.pageMargins ?? 1.0,
			setSettings: state.setGlobalSettings,
		})),
	)

	return (
		<Card.Row label={t('epubSettings.pageMargins')}>
			<Stepper
				value={store.pageMargins}
				onChange={(val) => store.setSettings({ pageMargins: val })}
				min={0.5}
				max={2.0}
				step={0.1}
				unit="%"
				formatValue={(val) => Math.round(val * 100).toString()}
				accessibilityLabel={t('epubSettings.pageMargins')}
			/>
		</Card.Row>
	)
}
