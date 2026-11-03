import { intlFormat } from 'date-fns'

import { Card } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'

export type DetailsCardProps = {
	hidden?: boolean
	metadata: Metadata
}

type Metadata = {
	extension?: string | undefined | null
	size?: string | undefined | null
	language?: string | undefined | null
	ageRating?: number | undefined | null
	readingDirection?: string | number | null
	published?: Date | undefined | null
	modified?: Date | undefined | null
	downloadedAt?: Date | undefined | null
}

export function DetailsCard({ hidden, metadata }: DetailsCardProps) {
	const { translate } = useTranslate()

	if (hidden) return null

	const showDetails = hasMetadata(metadata)
	if (!showDetails) return null

	const {
		extension,
		size,
		language,
		ageRating,
		readingDirection,
		published,
		downloadedAt,
		modified,
	} = metadata

	return (
		<Card label={translate('shared.common.details')}>
			{extension && (
				<Card.Row label={translate('shared.bookMetadata.format')} value={extension.toUpperCase()} />
			)}
			{!!size && <Card.Row label={translate('shared.bookMetadata.size')} value={size} />}
			{language && <Card.Row label={translate('shared.bookMetadata.language')} value={language} />}
			{ageRating != null && ageRating > 0 && (
				<Card.Row label={translate('shared.bookMetadata.ageRating')} value={`${ageRating}+`} />
			)}
			{readingDirection && <Card.Row label="Reading direction" value={readingDirection} />}
			{published && (
				<Card.Row
					label="Published"
					value={intlFormat(published, { month: 'long', day: 'numeric', year: 'numeric' })}
				/>
			)}
			{modified && (
				<Card.Row
					label="Modified"
					value={intlFormat(modified, { month: 'long', day: 'numeric', year: 'numeric' })}
				/>
			)}
			{!!downloadedAt && (
				<Card.Row
					label={translate('shared.bookMetadata.downloadedAt')}
					value={intlFormat(new Date(downloadedAt), {
						month: 'long',
						day: 'numeric',
						year: 'numeric',
					})}
				/>
			)}
		</Card>
	)
}

function hasMetadata(metadata: Metadata): boolean {
	return (
		!!metadata.extension ||
		!!metadata.language ||
		!!metadata.size ||
		(!!metadata.ageRating && metadata.ageRating > 0) ||
		!!metadata.downloadedAt
	)
}
