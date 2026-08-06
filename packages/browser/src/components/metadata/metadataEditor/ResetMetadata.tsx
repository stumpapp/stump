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
import { useLocaleContext } from '@stump/i18n'
import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'

type Props = {
	onConfirmReset: (impact: MetadataResetImpact) => void
	isDisabled?: boolean
}

export default function ResetMetadata({ onConfirmReset, isDisabled }: Props) {
	const { t } = useLocaleContext()
	const [showConfirmation, setShowConfirmation] = useState(false)

	const [impact, setImpact] = useState<MetadataResetImpact>(MetadataResetImpact.Series)

	const handleChange = (value: string) => {
		if (isImpact(value)) {
			setImpact(value)
		}
	}

	return (
		<div>
			<Button variant="destructive" disabled={isDisabled} onClick={() => setShowConfirmation(true)}>
				{t('metadataEditor.reset.action')}
			</Button>

			<ConfirmationModal
				title={t('metadataEditor.reset.action')}
				description={t('metadataEditor.reset.description')}
				isOpen={showConfirmation}
				confirmVariant="destructive"
				confirmText={t('common.delete')}
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
						label={t('metadataEditor.reset.series')}
						value="SERIES"
						description={t('metadataEditor.reset.seriesDescription')}
						className={cn('rounded-b-none border-0 bg-background hover:bg-muted/50', {
							'bg-muted/70 hover:bg-muted/70': impact === MetadataResetImpact.Series,
						})}
					/>

					<RadioGroup.CardItem
						label={t('metadataEditor.reset.books')}
						value="BOOKS"
						description={t('metadataEditor.reset.booksDescription')}
						className={cn('rounded-t-none border-0 bg-background hover:bg-muted/50', {
							'bg-muted/70 hover:bg-muted/70': impact === MetadataResetImpact.Books,
						})}
					/>

					<RadioGroup.CardItem
						label={t('metadataEditor.reset.everything')}
						value="EVERYTHING"
						description={t('metadataEditor.reset.everythingDescription')}
						className={cn('rounded-t-none border-0 bg-background hover:bg-muted/50', {
							'bg-muted/70 hover:bg-muted/70': impact === MetadataResetImpact.Everything,
						})}
					/>
				</RadioGroup>

				<Alert variant="warning">
					<AlertTriangle />
					<AlertTitle>{t('common.thisActionCannotBeUndone')}</AlertTitle>
					<AlertDescription>{t('metadataEditor.reset.warning')}</AlertDescription>
				</Alert>
			</ConfirmationModal>
		</div>
	)
}

const isImpact = (value: string): value is MetadataResetImpact => {
	return Object.values(MetadataResetImpact).includes(value as MetadataResetImpact)
}
