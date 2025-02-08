import { Button, Label, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

import { useLibraryManagement } from '../../context'
import CustomScanDialog from './customScan'

export default function ScannerActionsSection() {
	const { t } = useLocaleContext()
	const { scan } = useLibraryManagement()

	if (!scan) return null

	return (
		<div className="flex flex-col gap-y-6">
			<div className="flex flex-col gap-y-3">
				<div>
					<Label className="text-base">{t(getKey('defaultScan.heading'))}</Label>
					<Text variant="muted">{t(getKey('defaultScan.description'))}</Text>
				</div>
				<div>
					<Button size="sm" onClick={() => scan()}>
						{t(getKey('defaultScan.heading'))}
					</Button>
				</div>
			</div>

			<div className="flex flex-col gap-y-3">
				<div>
					<Label className="text-base">{t(getKey('configureScan.heading'))}</Label>
					<Text variant="muted">{t(getKey('configureScan.description'))}</Text>
				</div>

				<div>
					<CustomScanDialog onScan={scan} />
				</div>
			</div>
		</div>
	)
}

const LOCALE_BASE = 'librarySettingsScene.options/scanning.sections'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
