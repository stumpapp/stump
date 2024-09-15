import FileConversionOptionsPatchForm from './FileConversionOptionsPatchForm'
import IgnoreRulesPatchForm from './IgnoreRulesPatchForm'
import ScannerFeaturesPatchForm from './ScannerFeaturesPatchForm'

export default function GeneralFileOptionsScene() {
	return (
		<div className="flex flex-col gap-12">
			<ScannerFeaturesPatchForm />
			<FileConversionOptionsPatchForm />
			<IgnoreRulesPatchForm />
		</div>
	)
}
