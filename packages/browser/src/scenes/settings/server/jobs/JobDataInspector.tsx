import { Sheet, Text, usePrevious } from '@stump/components'
import { CoreJobOutput } from '@stump/types'
import React from 'react'

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
			<div className="flex flex-col pb-0">
				<div className="flex h-10 items-center bg-background-surface px-4">
					<Text size="sm" className="font-medium">
						Raw JSON
					</Text>
				</div>
				<div className="rounded-sm bg-background-surface p-4">
					<pre className="text-xs text-foreground-subtle">
						{JSON.stringify(displayedData, null, 2)}
					</pre>
				</div>
			</div>
		</Sheet>
	)
}
