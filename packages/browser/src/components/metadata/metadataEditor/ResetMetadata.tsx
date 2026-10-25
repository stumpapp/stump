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

import { useTranslate } from '@/hooks/useTranslate'

type Props = {
	onConfirmReset: (impact: MetadataResetImpact) => void
	isDisabled?: boolean
}

export default function ResetMetadata({ onConfirmReset, isDisabled }: Props) {
	const { t, translate } = useTranslate()

	const [showConfirmation, setShowConfirmation] = useState(false)

	const [impact, setImpact] = useState<MetadataResetImpact>(MetadataResetImpact.Series)

	const handleChange = (value: string) => {
		if (isImpact(value)) {
			setImpact(value)
		}
	}

	return (
		<div>
			<Button
				variant="destructive"
				disabled={isDisabled}
				onClick={() => setShowConfirmation(true)}
			>
				{t('metadataEditor.resetMetadata.deleteButton')}
			</Button>

			<ConfirmationModal
				title={t('metadataEditor.resetMetadata.title')}
				description={t('metadataEditor.resetMetadata.selectImpact')}
				isOpen={showConfirmation}
				confirmVariant="destructive"
				confirmText={translate('shared.common.delete')}
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
					className="divide gap-0 space-y-0 divide-y divide-border overflow-hidden rounded-xl border border-border"
				>
					<RadioGroup.CardItem
						label={translate('shared.common.series')}
						value="SERIES"
						description={t('metadataEditor.resetMetadata.impact.series.description')}
						className={cn('rounded-b-none border-0 bg-background hover:bg-muted/50', {
							'bg-muted/70 hover:bg-muted/70': impact === MetadataResetImpact.Series,
						})}
					/>

					<RadioGroup.CardItem
						label={translate('shared.common.book_other')}
						value="BOOKS"
						description={t('metadataEditor.resetMetadata.impact.books.description')}
						className={cn('rounded-t-none border-0 bg-background hover:bg-muted/50', {
							'bg-muted/70 hover:bg-muted/70': impact === MetadataResetImpact.Books,
						})}
					/>

					<RadioGroup.CardItem
						label={t('metadataEditor.resetMetadata.impact.everything.label')}
						value="EVERYTHING"
						description={t('metadataEditor.resetMetadata.impact.everything.description')}
						className={cn('rounded-t-none border-0 bg-background hover:bg-muted/50', {
							'bg-muted/70 hover:bg-muted/70': impact === MetadataResetImpact.Everything,
						})}
					/>
				</RadioGroup>

				<Alert variant="warning">
					<AlertTriangle />
					<AlertTitle>{t('common.cannotBeUndone')}</AlertTitle>
					<AlertDescription>
						{t('metadataEditor.resetMetadata.warning.description')}
					</AlertDescription>
				</Alert>
			</ConfirmationModal>
		</div>
	)
}

const isImpact = (value: string): value is MetadataResetImpact => {
	return Object.values(MetadataResetImpact).includes(value as MetadataResetImpact)
}
