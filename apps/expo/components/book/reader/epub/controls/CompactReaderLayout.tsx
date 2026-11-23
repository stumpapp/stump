import { useShallow } from 'zustand/react/shallow'

import { Card, Switch } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

export default function CompactReaderLayout() {
	const { translate } = useTranslate()
	const { compactEpubReaderLayout, patch } = usePreferencesStore(
		useShallow((state) => ({
			compactEpubReaderLayout: state.compactEpubReaderLayout,
			patch: state.patch,
		})),
	)

	return (
		<Card.Row label={translate('shared.epubSettings.compactReaderLayout')}>
			<Switch
				variant="brand"
				checked={compactEpubReaderLayout}
				onCheckedChange={(checked) => patch({ compactEpubReaderLayout: checked })}
			/>
		</Card.Row>
	)
}
