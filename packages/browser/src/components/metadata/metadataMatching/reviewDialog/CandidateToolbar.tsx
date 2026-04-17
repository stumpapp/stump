import { Button, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { upperFirst } from 'lodash'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { useMatchReviewStore } from '../useMatchReviewStore'
import { ConfidenceBadge } from './ConfidenceBadge'

export function CandidateToolbar() {
	const { t } = useLocaleContext()
	const { records, currentRecordIndex, currentCandidateIndex, nextCandidate, prevCandidate } =
		useMatchReviewStore()

	const record = records[currentRecordIndex]
	const candidates = record?.matchCandidates ?? []
	const candidate = candidates[currentCandidateIndex]

	const positionText = t(getKey('candidatePosition'))
		.replace('{{position}}', (currentCandidateIndex + 1).toString())
		.replace('{{total}}', candidates.length.toString())

	return (
		<div className="px-1 flex items-center justify-between">
			<div className="gap-2 flex items-center">
				<Button
					size="icon"
					variant="ghost"
					className="h-7 w-7"
					disabled={currentCandidateIndex === 0}
					onClick={prevCandidate}
				>
					<ChevronLeft className="h-4 w-4" />
				</Button>
				<Text size="sm">{positionText}</Text>
				<Button
					size="icon"
					variant="ghost"
					className="h-7 w-7"
					disabled={currentCandidateIndex >= candidates.length - 1}
					onClick={nextCandidate}
				>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>

			{candidate && (
				<div className="gap-3 flex items-center">
					<Text size="xs" variant="muted">
						{t(getKey('provider'))}:{' '}
						<span className="font-medium text-foreground">{upperFirst(candidate.provider)}</span>
					</Text>
					<ConfidenceBadge confidence={candidate.confidence} showLabel />
				</div>
			)}
		</div>
	)
}

const LOCALE_KEY = 'metadataMatching.reviewDialog.previewEditor.toolbar'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
