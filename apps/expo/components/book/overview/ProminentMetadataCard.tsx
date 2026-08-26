import { Card } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'

export type BookMetadataCardProps = {
	hidden?: boolean
	className?: string
	metadata: Metadata
}

type Metadata = {
	publisher: string | undefined | null
	volume: string | number | undefined | null
	year: number | undefined | null
	pages: number | undefined | null
}

export function ProminentMetadataCard({ hidden, className, metadata }: BookMetadataCardProps) {
	const { t } = useTranslate()

	if (hidden) return null

	const { publisher, volume, year, pages } = metadata

	return (
		<Card className={className}>
			<Card.StatGroup>
				{!!publisher && <Card.Stat label={t('bookMetadata.publisher')} value={publisher} />}
				{!!volume && <Card.Stat label={t('bookMetadata.volume')} value={volume} />}
				{year != null && year > 0 && <Card.Stat label={t('bookMetadata.year')} value={year} />}
				{pages && <Card.Stat label={t('common.pages')} value={pages} />}
			</Card.StatGroup>
		</Card>
	)
}
