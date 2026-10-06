import { useGraphQLMutation } from '@stump/client'
import { extractErrorMessage, FragmentType, graphql, useFragment } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import debounce from 'lodash/debounce'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { toast } from 'sonner-native'

import { JournalEditor } from '~/components/journal'
import { useTranslate } from '~/lib/hooks'

const fragment = graphql(`
	fragment SessionJournal on ReadingSession {
		id
		journalEntry {
			id
			content
			updatedAt
		}
	}
`)

const mutation = graphql(`
	mutation UpsertReadingSessionJournalEntry($sessionId: Int!, $content: String!) {
		upsertReadingSessionJournalEntry(sessionId: $sessionId, content: $content) {
			content
			updatedAt
		}
	}
`)

type Props = {
	fragmentRef: FragmentType<typeof fragment>
}

export function SessionJournal({ fragmentRef }: Props) {
	const data = useFragment(fragment, fragmentRef)
	const client = useQueryClient()

	const { t } = useTranslate()
	const { mutate } = useGraphQLMutation(mutation, {
		onSuccess: () => {
			client.invalidateQueries({
				queryKey: ['sessionById', data.id.toString()],
				exact: false, // order also in key
			})
		},
		onError: (error) => {
			const errorMessage = extractErrorMessage(error, t('errors.unknown'))
			toast.error('Failed to save entry', {
				description: errorMessage,
			})
		},
	})

	const upsertEntry = (content: string) => mutate({ sessionId: data.id, content })
	const debouncedUpsert = debounce(upsertEntry, 1500)

	useEffect(() => () => debouncedUpsert.flush(), [debouncedUpsert])
	// ^ if pending txn when unmounting ensure we run it immediately

	// TODO(reading-journal): hook up with gql:
	// - deleteJournalEntry(entryId) when the content is cleared ???
	const [draft, setDraft] = useState(data.journalEntry?.content ?? '')

	const onTextChange = (text: string) => {
		setDraft(text)
		debouncedUpsert(text)
	}

	return (
		<View className="px-4">
			<JournalEditor value={draft} onChange={onTextChange} />
		</View>
	)
}
