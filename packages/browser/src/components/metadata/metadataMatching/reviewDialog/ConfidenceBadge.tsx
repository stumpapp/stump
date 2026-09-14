import { Badge } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

type Props = {
	confidence: number
	showLabel?: boolean
}

export function ConfidenceBadge({ confidence, showLabel }: Props) {
	const { t } = useLocaleContext()

	const pct = Math.round(confidence * 100)
	const variant = pct >= 90 ? 'success' : pct >= 70 ? 'warning' : 'error'

	return (
		<Badge variant={variant} size="xs">
			{pct}%{showLabel && ` ${t('metadataMatching.confidenceBadge.label')}`}
		</Badge>
	)
}
