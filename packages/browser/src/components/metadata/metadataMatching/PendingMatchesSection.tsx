import { Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Suspense } from 'react'

import { PendingMatchesTable } from './PendingMatchesTable'
import { MatchReviewDialog } from './reviewDialog/MatchReviewDialog'

export default function PendingMatchesSection() {
	const { t } = useLocaleContext()

	return (
		<div className="gap-y-4 flex flex-col">
			<div>
				<Heading size="sm">{t('metadataMatching.section.heading')}</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					{t('metadataMatching.section.description')}
				</Text>
			</div>

			<Suspense fallback={null}>
				<PendingMatchesTable />
			</Suspense>

			<MatchReviewDialog />
		</div>
	)
}
