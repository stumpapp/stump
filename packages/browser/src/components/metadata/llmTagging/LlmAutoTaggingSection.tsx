import { useCheckPermission } from '@/context'
import { useGraphQL, useGraphQLMutation, useSuspenseGraphQL } from '@stump/client'
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Badge,
	Button,
	Heading,
	Text,
} from '@stump/components'
import { extractErrorMessage, graphql, useFragment, UserPermission } from '@stump/graphql'
import { Info, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { useTranslate } from '@/hooks/useTranslate'
import { useLibraryContext } from '@/scenes/library/context'

import {
	LLM_TAG_SUGGESTION_FRAGMENT,
	PendingTagSuggestionsTable,
	TagReviewDialog,
	useLlmTagActions,
	useLlmTagReviewStore,
} from '.'

const pendingQuery = graphql(`
	query LlmAutoTaggingPendingSuggestions {
		pendingLlmTagSuggestions {
			id
			...LlmTagSuggestion
		}
	}
`)

const configQuery = graphql(`
	query LlmAutoTaggingConfig {
		llmTaggingConfig {
			enabled
		}
	}
`)

const runMutation = graphql(`
	mutation RunLlmTagging($id: ID!, $forceRefetch: Boolean) {
		runLlmTagging(id: $id, forceRefetch: $forceRefetch)
	}
`)

const LOCALE_KEY = 'librarySettingsScene.integrations/metadata.sections.llmTagging'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`

export default function LlmAutoTaggingSection() {
	const { library } = useLibraryContext()
	const { t } = useTranslate()
	const isManager = useCheckPermission(UserPermission.ManageServer)

	const {
		data: { pendingLlmTagSuggestions },
	} = useSuspenseGraphQL(pendingQuery, ['pendingLlmTagSuggestions', library.id])

	const { data: configData } = useGraphQL(
		configQuery,
		['llmTaggingConfig', 'libraryMetadata', library.id],
		undefined,
		{ enabled: isManager },
	)

	const records = useFragment(LLM_TAG_SUGGESTION_FRAGMENT, pendingLlmTagSuggestions ?? [])

	const openReview = useLlmTagReviewStore((s) => s.open)
	const { acceptAll, rejectAll, isBulkPending } = useLlmTagActions()

	const [isQueuing, setIsQueuing] = useState(false)

	const { mutate: runTagging } = useGraphQLMutation(runMutation, {
		onMutate: () => setIsQueuing(true),
		onSettled: () => setIsQueuing(false),
		onSuccess: ({ runLlmTagging: queued }) => {
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

	const llmConfigured = isManager ? !!configData?.llmTaggingConfig : null

	return (
		<div className="flex flex-col gap-6">
			<div>
				<Heading size="sm">{t(getKey('heading'))}</Heading>
				<Text size="sm" variant="muted">
					{t(getKey('description'))}
				</Text>
			</div>

			{llmConfigured === false && (
				<Alert variant="info">
					<Info />
					<AlertTitle>{t(getKey('notConfigured.title'))}</AlertTitle>
					<AlertDescription>{t(getKey('notConfigured.description'))}</AlertDescription>
				</Alert>
			)}

			<div className="flex flex-wrap items-center gap-2">
				<Button
					onClick={() => runTagging({ id: library.id, forceRefetch: false })}
					disabled={isQueuing}
					data-testid="llm-auto-tagging-run-button"
				>
					<Sparkles data-icon="inline-start" />
					{t(getKey('runButton'))}
				</Button>
				{records.length > 0 && (
					<>
						<Button
							variant="ghost"
							onClick={acceptAll}
							disabled={isBulkPending}
							data-testid="llm-auto-tagging-accept-all"
						>
							{t(getKey('acceptAll'))}
						</Button>
						<Button
							variant="ghost"
							onClick={rejectAll}
							disabled={isBulkPending}
							data-testid="llm-auto-tagging-reject-all"
						>
							{t(getKey('rejectAll'))}
						</Button>
						<Badge variant="primary">
							{t(getKey('pendingCount'), { count: records.length })}
						</Badge>
					</>
				)}
			</div>

			{records.length > 0 && (
				<PendingTagSuggestionsTable
					records={records}
					maxRows={8}
					onReview={(index) => openReview(records, index)}
					onReject={() => undefined}
					isRejecting={isBulkPending}
				/>
			)}

			<TagReviewDialog />
		</div>
	)
}
