import { Suspense } from 'react'

import { useLibraryManagement } from '../../context'
import FileConversionOptionsPatchForm from './FileConversionOptionsPatchForm'
import IgnoreRulesPatchForm from './IgnoreRulesPatchForm'
import ScannerActionsSection from './ScannerActionsSection'
import ScannerFeaturesPatchForm from './ScannerFeaturesPatchForm'
import ScanningSection from './ScanningSection'

export default function GeneralFileOptionsScene() {
	const { scan } = useLibraryManagement()

	return (
		<div className="flex flex-col gap-12">
			{scan && (
				<Suspense>
					<ScannerActionsSection />
				</Suspense>
			)}

			<ScanningSection />

			<ScannerFeaturesPatchForm />
			<FileConversionOptionsPatchForm />
			<IgnoreRulesPatchForm />
		</div>
	)
}
