import FileConversionOptionsPatchForm from './FileConversionOptionsPatchForm'
import IgnoreRulesPatchForm from './IgnoreRulesPatchForm'

export default function GeneralFileOptionsScene() {
	return (
		<div className="flex flex-col gap-12">
			<IgnoreRulesPatchForm />
			<FileConversionOptionsPatchForm />
		</div>
	)
}
