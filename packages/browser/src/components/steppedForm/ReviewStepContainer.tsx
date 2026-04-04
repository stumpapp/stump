import { Heading, Text } from '@stump/components'
import { PropsWithChildren } from 'react'

type StepContainerProps = PropsWithChildren<{
	label: string
	description: string
}>

export const ReviewStepContainer = ({ label, description, children }: StepContainerProps) => (
	<div className="space-y-4 md:space-y-0 grid grid-cols-7 justify-between">
		<div className="md:col-span-4 col-span-7">
			<Heading size="sm">{label}</Heading>
			<Text size="sm" variant="muted" className="mt-1.5">
				{description}
			</Text>
		</div>

		<div className="space-y-2 md:col-span-3 col-span-7 flex flex-col">{children}</div>
	</div>
)
