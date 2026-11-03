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
	issue?: number | undefined | null
	year: number | undefined | null
	pages: number | undefined | null
}

export function ProminentMetadataCard({ hidden, className, metadata }: BookMetadataCardProps) {
	const { translate } = useTranslate()

	if (hidden) return null

	const { publisher, volume, year, pages, issue } = metadata

	return (
		<Card className={className}>
			<Card.StatGroup>
				{!!publisher && (
					<Card.Stat label={translate('shared.bookMetadata.publisher')} value={publisher} />
				)}
				{!!volume && <Card.Stat label={translate('shared.bookMetadata.volume')} value={volume} />}
				{!!issue && <Card.Stat label={translate('shared.bookMetadata.issue')} value={issue} />}
				{year != null && year > 0 && (
					<Card.Stat label={translate('shared.bookMetadata.year')} value={year} />
				)}
				{pages && <Card.Stat label={translate('shared.common.pages')} value={pages} />}
			</Card.StatGroup>
		</Card>
	)
}
