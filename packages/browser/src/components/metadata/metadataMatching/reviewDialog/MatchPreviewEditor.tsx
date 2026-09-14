import { Card, cn, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useOverlayScrollbars } from 'overlayscrollbars-react'
import { useEffect, useMemo, useRef } from 'react'

import { usePreferences } from '@/hooks/usePreferences'
import { useTheme } from '@/hooks/useTheme'

import {
	FieldComparison,
	getMediaFieldComparisons,
	getSeriesFieldComparisons,
	isMediaCandidate,
} from '../types'
import { useMatchReviewStore } from '../useMatchReviewStore'
import { CandidateToolbar } from './CandidateToolbar'
import { MatchFieldRow } from './MatchFieldRow'

export function MatchPreviewEditor() {
	const { t } = useLocaleContext()
	const {
		preferences: { enableHideScrollbar },
	} = usePreferences()
	const { records, currentRecordIndex, currentCandidateIndex } = useMatchReviewStore()

	const record = records[currentRecordIndex]
	const candidate = record?.matchCandidates?.[currentCandidateIndex]
	const isMedia = !!record?.mediaId
	const currentMetadata = isMedia ? record?.media?.metadata : record?.series?.metadata

	const fieldComparisons: FieldComparison[] = useMemo(() => {
		if (!candidate) return []
		const meta = candidate.metadata as Record<string, unknown>
		if (isMedia && isMediaCandidate(candidate.metadata)) {
			return getMediaFieldComparisons(currentMetadata, meta)
		} else if (!isMedia && !isMediaCandidate(candidate.metadata)) {
			return getSeriesFieldComparisons(currentMetadata, meta)
		}
		return []
	}, [candidate, currentMetadata, isMedia])

	const scrollRef = useRef<HTMLDivElement>(null)

	const { isDarkVariant } = useTheme()
	const [initialize] = useOverlayScrollbars({
		options: {
			scrollbars: {
				theme: isDarkVariant ? 'os-theme-light' : 'os-theme-dark',
			},
		},
	})

	useEffect(() => {
		const { current: scrollContainer } = scrollRef
		if (scrollContainer && !enableHideScrollbar) {
			initialize(scrollContainer)
		}
	}, [initialize, enableHideScrollbar])

	if (!candidate) {
		return (
			<div className="py-12 flex flex-1 items-center justify-center">
				<Text variant="muted">{t(getKey('noCandidates'))}</Text>
			</div>
		)
	}

	// Note: I didn't use a table because I couldn't quite get the layout I wanted
	return (
		<>
			<CandidateToolbar />
			<div
				className={cn('p-4 overflow-y-auto rounded-xl bg-border/25', {
					'scrollbar-hide': enableHideScrollbar,
				})}
				ref={scrollRef}
				data-overlayscrollbars-initialize
			>
				<Card className="overflow-hidden">
					<div className="py-2.5 pl-2.5 grid grid-cols-[140px_1fr_1fr_40px_1fr_32px] items-center border-b border-border bg-muted/50">
						<Heading className="text-sm font-medium">{t(getKey('headers.field'))}</Heading>
						<Heading className="text-sm font-medium">{t(getKey('headers.current'))}</Heading>
						<Heading className="text-sm font-medium">{t(getKey('headers.external'))}</Heading>
						<div />
						<Heading className="text-sm font-medium">{t(getKey('headers.resolved'))}</Heading>
						<div />
					</div>

					<div className="divide-y divide-border">
						{fieldComparisons.map((comparison) => (
							<MatchFieldRow key={comparison.field} comparison={comparison} />
						))}
						{fieldComparisons.length === 0 && (
							<div className="py-12 flex items-center justify-center">
								<Text variant="muted">{t(getKey('noComparableFields'))}</Text>
							</div>
						)}
					</div>
				</Card>
			</div>
			<div className="flex-1" />
		</>
	)
}

const LOCALE_KEY = 'metadataMatching.reviewDialog.previewEditor'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
