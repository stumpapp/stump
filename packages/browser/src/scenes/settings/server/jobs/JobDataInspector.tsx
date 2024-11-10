import { Preformatted, Sheet, usePrevious } from '@stump/components'
import { CoreJobOutput } from '@stump/sdk'

type Props = {
	data?: CoreJobOutput | null
	onClose: () => void
}
export default function JobDataInspector({ data, onClose }: Props) {
	const fallback = usePrevious(data)

	const displayedData = data || fallback

	return (
		<Sheet
			open={!!data}
			onClose={onClose}
			title="Job data"
			description="The final output of the job after it had completed"
		>
			<Preformatted title="Raw JSON">{JSON.stringify(displayedData, null, 2)}</Preformatted>
		</Sheet>
	)
}
