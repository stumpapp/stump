import { Button, NewCard } from '@stump/components'

import { useTranslate } from '@/hooks/useTranslate'

import { useLibraryManagement } from '../../context'
import CustomScanDialog from './customScan'

export default function ScannerActionsSection() {
	const { t, translate } = useTranslate()
	const { scan } = useLibraryManagement()

	if (!scan) return null

	return (
		<NewCard>
			<NewCard.Row
				label={t(getKey('defaultScan.heading'))}
				description={t(getKey('defaultScan.description'))}
			>
				<Button size="sm" onClick={() => scan()} variant="outline">
					{translate('shared.common.run')}
				</Button>
			</NewCard.Row>

			<NewCard.Row
				label={t(getKey('configureScan.heading'))}
				description={t(getKey('defaultScan.description'))}
			>
				<div>
					<CustomScanDialog onScan={scan} />
				</div>
			</NewCard.Row>
		</NewCard>
	)
}

const LOCALE_BASE = 'librarySettingsScene.options/scanning.sections'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
