import { Suspense } from 'react'

import FileConversionOptionsPatchForm from './FileConversionOptionsPatchForm'
import IgnoreRulesPatchForm from './IgnoreRulesPatchForm'
import ScannerActionsSection from './ScannerActionsSection'
import ScannerFeaturesPatchForm from './ScannerFeaturesPatchForm'

export default function ScannerSettingsScene() {
	return (
		<div className="flex flex-col gap-12">
			<Suspense>
				<ScannerActionsSection />
			</Suspense>

			<ScannerFeaturesPatchForm />
			<FileConversionOptionsPatchForm />
			<IgnoreRulesPatchForm />
		</div>
	)
}
