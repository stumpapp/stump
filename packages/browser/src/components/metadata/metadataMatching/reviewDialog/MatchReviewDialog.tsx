import { Dialog } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

import { useMatchReviewStore } from '../useMatchReviewStore'
import { MatchPreviewEditor } from './MatchPreviewEditor'
import { ReviewDialogFooter } from './ReviewDialogFooter'

export function MatchReviewDialog() {
	const { t } = useLocaleContext()
	const { isOpen, close, records, currentRecordIndex } = useMatchReviewStore()

	const record = records[currentRecordIndex]
	const isMedia = !!record?.mediaId
	const entityName = record?.media?.resolvedName ?? record?.series?.resolvedName ?? 'Unknown'

	if (!record) return null

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
			<Dialog.Content size="gargantuan" className="flex max-h-[85vh] flex-col">
				<Dialog.Header>
					<Dialog.Title>{entityName}</Dialog.Title>
					<Dialog.Description>{isMedia ? t('common.book') : t('common.series')}</Dialog.Description>
					<Dialog.Close />
				</Dialog.Header>

				<MatchPreviewEditor />
				<ReviewDialogFooter />
			</Dialog.Content>
		</Dialog>
	)
}
