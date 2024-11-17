import { Suspense } from 'react'

import { useLibraryManagement } from '../../context'
import FileConversionOptionsPatchForm from './FileConversionOptionsPatchForm'
import IgnoreRulesPatchForm from './IgnoreRulesPatchForm'
import ScannerActionsSection from './ScannerActionsSection'
import ScannerFeaturesPatchForm from './ScannerFeaturesPatchForm'

export default function GeneralFileOptionsScene() {
	const { scan } = useLibraryManagement()

	return (
		<div className="flex flex-col gap-12">
			{scan && (
				// <div className="flex flex-col gap-y-3">
				// 	<div>
				// 		<Label className="text-base">Default scan</Label>
				// 		<Text variant="muted">A standard scan to index your library for new content</Text>
				// 	</div>
				// 	<div>
				// 		<Button size="sm" onClick={scan}>
				// 			Default scan
				// 		</Button>
				// 	</div>
				// </div>
				<Suspense>
					<ScannerActionsSection />
				</Suspense>
			)}

			<ScannerFeaturesPatchForm />
			<FileConversionOptionsPatchForm />
			<IgnoreRulesPatchForm />
		</div>
	)
}
