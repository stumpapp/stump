import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useState } from 'react'
import { View } from 'react-native'

import { JournalEditor } from '~/components/journal'

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

type Props = {
	fragmentRef: FragmentType<typeof fragment>
}

export function SessionJournal({ fragmentRef }: Props) {
	const data = useFragment(fragment, fragmentRef)

	// TODO(reading-journal): hook up with gql:
	// - upsertReadingSessionJournalEntry(sessionId, content), debounced on change or on blur ??
	// - deleteJournalEntry(entryId) when the content is cleared ???
	const [draft, setDraft] = useState(data.journalEntry?.content ?? '')

	return (
		<View className="px-4">
			<JournalEditor value={draft} onChange={setDraft} />
		</View>
	)
}
