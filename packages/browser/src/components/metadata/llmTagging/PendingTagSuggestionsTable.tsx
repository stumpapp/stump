import { Badge, Button, Text } from '@stump/components'

import { useTranslate } from '@/hooks/useTranslate'

import { displayNameForSuggestion, formatConfidence, PendingTagSuggestion } from './types'

type PendingTagSuggestionsTableProps = {
	records: PendingTagSuggestion[]
	onReview: (index: number) => void
	onReject: (record: PendingTagSuggestion) => void
	isRejecting?: boolean
	maxRows?: number
}

const LOCALE_KEY = 'metadataMatching.llmTagging.queue'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`

export default function PendingTagSuggestionsTable({
	records,
	onReview,
	onReject,
	isRejecting,
	maxRows = 5,
}: PendingTagSuggestionsTableProps) {
	const { t } = useTranslate()

	const visible = records.slice(0, maxRows)

	return (
		<div className="flex flex-col gap-3">
			<table className="w-full table-fixed border-collapse text-left">
				<thead>
					<tr className="border-b border-edge">
						<th className="w-[40%] pb-2 text-sm font-medium">
							{t(getKey('columns.book'))}
						</th>
						<th className="pb-2 text-sm font-medium">{t(getKey('columns.tags'))}</th>
						<th className="w-[10%] pb-2 text-right text-sm font-medium">
							{t(getKey('columns.actions'))}
						</th>
					</tr>
				</thead>
				<tbody>
					{visible.map((record, index) => (
						<tr key={record.id} className="border-b border-edge">
							<td className="py-2 pr-2">
								<Text size="sm" className="truncate" title={displayNameForSuggestion(record)}>
									{displayNameForSuggestion(record)}
								</Text>
							</td>
							<td className="py-2 pr-2">
								<div className="flex flex-wrap gap-1">
									{record.suggestedTags.slice(0, 4).map((tag) => (
										<Badge key={tag.name} variant="primary" size="xs">
											{tag.name} · {formatConfidence(tag.confidence)}
										</Badge>
									))}
									{record.suggestedTags.length > 4 && (
										<Badge variant="secondary" size="xs">
											+{record.suggestedTags.length - 4}
										</Badge>
									)}
								</div>
							</td>
							<td className="py-2">
								<div className="flex justify-end gap-1.5">
									<Button
										variant="ghost"
										size="xs"
										onClick={() => onReview(index)}
										data-testid="llm-tag-review-button"
									>
										{t(getKey('review'))}
									</Button>
									<Button
										variant="ghost"
										size="xs"
										onClick={() => onReject(record)}
										disabled={isRejecting}
										data-testid="llm-tag-quick-reject-button"
									>
										{t(getKey('reject'))}
									</Button>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>

			{records.length > visible.length && (
				<Text size="xs" variant="muted">
					{t(getKey('moreRecords'), { count: records.length - visible.length })}
				</Text>
			)}
		</div>
	)
}
