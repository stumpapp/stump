import { Button, CheckBox, Dialog, Heading, Text } from '@stump/components'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { useTranslate } from '@/hooks/useTranslate'

import { displayNameForSuggestion, formatConfidence } from './types'
import { useLlmTagActions } from './useLlmTagActions'
import { useLlmTagReviewStore } from './useLlmTagReviewStore'

const LOCALE_KEY = 'metadataMatching.llmTagging.reviewDialog'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`

export default function TagReviewDialog() {
	const { t } = useTranslate()
	const { isOpen, records, currentRecordIndex, selectedTags, close, prevRecord, toggleTag } =
		useLlmTagReviewStore()
	const { acceptSelected, rejectCurrent, isPending, hasSelection, selectedCount } =
		useLlmTagActions()

	const record = records[currentRecordIndex]

	if (!record) return null

	const hasPrev = currentRecordIndex > 0
	const hasNext = currentRecordIndex < records.length - 1

	return (
		<Dialog open={isOpen} onOpenChange={(open) => (!open ? close() : undefined)}>
			<Dialog.Content size="md" className="flex max-h-[85vh] flex-col overflow-y-auto">
				<div className="flex flex-col gap-6">
					<div className="flex items-start justify-between gap-4">
						<div className="min-w-0">
							<Heading size="sm">{t(getKey('heading'))}</Heading>
							<Text size="sm" variant="muted" className="truncate">
								{displayNameForSuggestion(record)}
							</Text>
						</div>
						<Text size="xs" variant="muted" className="whitespace-nowrap pt-1">
							{currentRecordIndex + 1} / {records.length}
						</Text>
					</div>

					<div className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
						{record.suggestedTags.map((tag) => (
							<label
								key={tag.name}
								className="hover:bg-surface flex cursor-pointer items-start gap-3 rounded-md border border-edge p-3"
							>
								<CheckBox
									className="mt-0.5"
									checked={selectedTags.has(tag.name)}
									onCheckedChange={() => toggleTag(tag.name)}
								/>
								<span className="flex min-w-0 flex-col gap-0.5">
									<span className="flex items-center gap-2">
										<Text size="sm" className="font-semibold">
											{tag.name}
										</Text>
										<Text size="xs" variant="muted">
											{formatConfidence(tag.confidence)}
										</Text>
									</span>
									{tag.reason && (
										<Text size="xs" variant="muted">
											{tag.reason}
										</Text>
									)}
								</span>
							</label>
						))}
					</div>

					<div className="flex items-center justify-between gap-3">
						<div className="flex gap-1.5">
							<Button
								variant="ghost"
								size="sm"
								disabled={!hasPrev || isPending}
								onClick={prevRecord}
							>
								<ChevronLeft data-icon="inline-start" />
								{t(getKey('previous'))}
							</Button>
							<Button
								variant="ghost"
								size="sm"
								disabled={isPending}
								onClick={close}
							>
								{t(getKey('skipAll'))}
							</Button>
							<Button
								variant="ghost"
								size="sm"
								disabled={!hasNext || isPending}
								onClick={() => (hasNext ? undefined : close())}
							>
								{t(getKey('next'))}
								<ChevronRight data-icon="inline-end" />
							</Button>
						</div>

						<div className="flex gap-1.5">
							<Button
								variant="ghost"
								size="sm"
								disabled={isPending}
								onClick={rejectCurrent}
							>
								{t(getKey('reject'))}
							</Button>
							<Button
								variant="default"
								size="sm"
								disabled={isPending || !hasSelection}
								onClick={acceptSelected}
								data-testid="llm-tag-accept-button"
							>
								{selectedCount > 0
									? t(getKey('acceptSelected'), { count: selectedCount })
									: t(getKey('accept'))}
							</Button>
						</div>
					</div>
				</div>
			</Dialog.Content>
		</Dialog>
	)
}
