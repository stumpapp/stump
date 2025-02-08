import { Button, Label, Text } from '@stump/components'

import { useLibraryManagement } from '../context'
import FileConversionOptionsPatchForm from './FileConversionOptionsPatchForm'
import IgnoreRulesPatchForm from './IgnoreRulesPatchForm'
import ScannerFeaturesPatchForm from './ScannerFeaturesPatchForm'

export default function GeneralFileOptionsScene() {
	const { scan } = useLibraryManagement()

	return (
		<div className="flex flex-col gap-12">
			{scan && (
				<div className="flex flex-col gap-y-3">
					<div>
						<Label className="text-base">Default scan</Label>
						<Text variant="muted">A standard scan to index your library for new content</Text>
					</div>
					<div>
						<Button size="sm" onClick={scan}>
							Default scan
						</Button>
					</div>
				</div>
			)}

			<ScannerFeaturesPatchForm />
			<FileConversionOptionsPatchForm />
			<IgnoreRulesPatchForm />
		</div>
	)
}
