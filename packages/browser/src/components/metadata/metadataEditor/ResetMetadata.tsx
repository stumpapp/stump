import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	cn,
	ConfirmationModal,
	RadioGroup,
} from '@stump/components'
import { MetadataResetImpact } from '@stump/graphql'
import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'

type Props = {
	onConfirmReset: (impact: MetadataResetImpact) => void
	isDisabled?: boolean
}

export default function ResetMetadata({ onConfirmReset, isDisabled }: Props) {
	const [showConfirmation, setShowConfirmation] = useState(false)

	const [impact, setImpact] = useState<MetadataResetImpact>(MetadataResetImpact.Series)

	const handleChange = (value: string) => {
		if (isImpact(value)) {
			setImpact(value)
		}
	}

	return (
		<div>
			<Button variant="danger" disabled={isDisabled} onClick={() => setShowConfirmation(true)}>
				Delete metadata
			</Button>

			<ConfirmationModal
				title="Delete metadata"
				description="Select the impact for the deletion"
				isOpen={showConfirmation}
				confirmVariant="danger"
				confirmText="Delete"
				onConfirm={() => {
					onConfirmReset(impact)
					setShowConfirmation(false)
				}}
				onClose={() => setShowConfirmation(false)}
				size="md"
			>
				<RadioGroup
					value={impact}
					onValueChange={handleChange}
					className="divide gap-0 space-y-0 divide-y divide-edge overflow-hidden rounded-xl border border-edge"
				>
					<RadioGroup.CardItem
						label="Series"
						value="SERIES"
						description="Remove only this series' metadata"
						className={cn('rounded-b-none border-0 bg-background hover:bg-background-surface/50', {
							'bg-background-surface/70 hover:bg-background-surface/70':
								impact === MetadataResetImpact.Series,
						})}
					/>

					<RadioGroup.CardItem
						label="Books"
						value="BOOKS"
						description="Remove all the metadata for books in this series "
						className={cn('rounded-t-none border-0 bg-background hover:bg-background-surface/50', {
							'bg-background-surface/70 hover:bg-background-surface/70':
								impact === MetadataResetImpact.Books,
						})}
					/>

					<RadioGroup.CardItem
						label="Everything"
						value="EVERYTHING"
						description="Remove all the metadata for everything related to this series"
						className={cn('rounded-t-none border-0 bg-background hover:bg-background-surface/50', {
							'bg-background-surface/70 hover:bg-background-surface/70':
								impact === MetadataResetImpact.Everything,
						})}
					/>
				</RadioGroup>

				<Alert variant="warning">
					<AlertTriangle />
					<AlertTitle>This action cannot be undone</AlertTitle>
					<AlertDescription>
						This will permanently delete all metadata for the selected items. You will need to
						trigger a custom scan to regenerate the metadata
					</AlertDescription>
				</Alert>
			</ConfirmationModal>
		</div>
	)
}

const isImpact = (value: string): value is MetadataResetImpact => {
	return Object.values(MetadataResetImpact).includes(value as MetadataResetImpact)
}
