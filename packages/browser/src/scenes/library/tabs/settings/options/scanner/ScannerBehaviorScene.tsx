import { useLibraryManagement } from '../../context'
import FileConversionOptionsPatchForm from './FileConversionOptionsPatchForm'
import ScanHistorySection from './history'
import IgnoreRulesPatchForm from './IgnoreRulesPatchForm'
import ScannerActionsSection from './ScannerActionsSection'
import ScannerFeaturesPatchForm from './ScannerFeaturesPatchForm'

export default function GeneralFileOptionsScene() {
	const { scan } = useLibraryManagement()

	return (
		<div className="flex flex-col gap-12">
			{scan && <ScannerActionsSection />}

			<ScanHistorySection />

			<ScannerFeaturesPatchForm />
			<FileConversionOptionsPatchForm />
			<IgnoreRulesPatchForm />
		</div>
	)
}
