import { useGraphQLMutation, useSuspenseGraphQL } from '@stump/client'
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Badge,
	Button,
	Heading,
	Text,
} from '@stump/components'
import { extractErrorMessage, graphql } from '@stump/graphql'
import { BookCheck, Info } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { useTranslate } from '@/hooks/useTranslate'
import { useLibraryContext } from '@/scenes/library/context'

const draftsQuery = graphql(`
	query LlmLibraryTagDrafts($libraryId: ID!) {
		llmLibraryTagDrafts(libraryId: $libraryId) {
			id
			status
			finalTagList
			assignments {
				mediaId
				tags
			}
			booksAnalyzed
			completedBatches
			totalBatches
			createdAt
			updatedAt
		}
	}
`)

const runAnalysisMutation = graphql(`
	mutation RunLlmLibraryTagAnalysis($id: ID!, $forceRefetch: Boolean) {
		runLlmLibraryTagAnalysis(id: $id, forceRefetch: $forceRefetch)
	}
`)

const applyMutation = graphql(`
	mutation ApplyLlmLibraryTagSuggestions($draftId: Int!) {
		applyLibraryTagSuggestions(draftId: $draftId)
	}
`)

const LOCALE_KEY = 'librarySettingsScene.integrations/metadata.sections.libraryTagAnalysis'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`

type LlmLibraryTagDraft = {
	id: number
	status: string
	finalTagList?: string[] | null
	assignments: { mediaId: string; tags: string[] }[]
	booksAnalyzed: number
	completedBatches: number
	totalBatches: number
	createdAt: string
	updatedAt?: string | null
}

export default function LibraryTagAnalysisSection() {
	const { library } = useLibraryContext()
	const { t } = useTranslate()

	const {
		data: { llmLibraryTagDrafts },
	} = useSuspenseGraphQL(draftsQuery, ['llmLibraryTagDrafts', library.id], {
		libraryId: library.id,
	})

	const drafts = (llmLibraryTagDrafts ?? []) as LlmLibraryTagDraft[]
	const latestDraft = drafts[0]

	const [isQueuing, setIsQueuing] = useState(false)
	const [isApplying, setIsApplying] = useState(false)

	const { mutate: runAnalysis } = useGraphQLMutation(runAnalysisMutation, {
		onMutate: () => setIsQueuing(true),
		onSettled: () => setIsQueuing(false),
		onSuccess: ({ runLlmLibraryTagAnalysis: queued }) => {
			if (queued) {
				toast.success(t(getKey('toasts.jobQueued')))
			} else {
				toast.info(t(getKey('toasts.notConfigured')))
			}
		},
		onError: (error) => {
			toast.error(t(getKey('toasts.jobFailed')), {
				description: extractErrorMessage(error),
			})
		},
	})

	const { mutate: applyDraft } = useGraphQLMutation(applyMutation, {
		onMutate: () => setIsApplying(true),
		onSettled: () => setIsApplying(false),
		onSuccess: ({ applyLibraryTagSuggestions: applied }) => {
			toast.success(t(getKey('toasts.applied'), { count: applied ?? 0 }))
		},
		onError: (error) => {
			toast.error(t(getKey('toasts.applyFailed')), {
				description: extractErrorMessage(error),
			})
		},
	})

	const isInProgress =
		latestDraft?.status === 'IN_PROGRESS' || latestDraft?.status === 'RATE_LIMITED'
	const canApply = latestDraft?.status === 'AWAITING_REVIEW'
	const tagCount = latestDraft?.finalTagList?.length ?? 0

	return (
		<div className="flex flex-col gap-6">
			<div>
				<Heading size="sm">{t(getKey('heading'))}</Heading>
				<Text size="sm" variant="muted">
					{t(getKey('description'))}
				</Text>
			</div>

			{latestDraft && (
				<div className="flex flex-col gap-2 rounded-md border border-edge p-4">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant={canApply ? 'success' : isInProgress ? 'warning' : 'secondary'}>
							{t(getKey(`status.${latestDraft.status}`))}
						</Badge>
						<Text size="xs" variant="muted">
							{t(getKey('progress'), {
								completed: latestDraft.completedBatches,
								total: latestDraft.totalBatches,
							})}
						</Text>
					</div>
					<Text size="xs" variant="muted">
						{t(getKey('summary'), {
							books: latestDraft.booksAnalyzed,
							tags: tagCount,
						})}
					</Text>
					{tagCount > 0 && canApply && (
						<div className="flex flex-wrap gap-1">
							{(latestDraft.finalTagList ?? []).slice(0, 24).map((tag) => (
								<Badge key={tag} variant="primary" size="xs">
									{tag}
								</Badge>
							))}
							{tagCount > 24 && (
								<Badge variant="secondary" size="xs">
									+{tagCount - 24}
								</Badge>
							)}
						</div>
					)}
				</div>
			)}

			{canApply && (
				<Alert variant="info">
					<Info />
					<AlertTitle>{t(getKey('applyReady.title'))}</AlertTitle>
					<AlertDescription>{t(getKey('applyReady.description'))}</AlertDescription>
				</Alert>
			)}

			<div className="flex flex-wrap items-center gap-2">
				<Button
					onClick={() => runAnalysis({ id: library.id, forceRefetch: false })}
					disabled={isQueuing}
					data-testid="llm-library-analysis-run-button"
				>
					<BookCheck data-icon="inline-start" />
					{isInProgress
						? t(getKey('resumeButton'))
						: t(getKey('runButton'))}
				</Button>

				{latestDraft && isInProgress && (
					<Button
						variant="ghost"
						onClick={() => runAnalysis({ id: library.id, forceRefetch: true })}
						disabled={isQueuing}
					>
						{t(getKey('restartButton'))}
					</Button>
				)}

				{canApply && (
					<Button
						variant="secondary"
						onClick={() => applyDraft({ draftId: latestDraft.id })}
						disabled={isApplying}
						data-testid="llm-library-analysis-apply-button"
					>
						{t(getKey('applyButton'))}
					</Button>
				)}
			</div>
		</div>
	)
}
