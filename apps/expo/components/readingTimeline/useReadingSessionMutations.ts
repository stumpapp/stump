import { useGraphQLMutation } from '@stump/client'
import { extractErrorMessage, graphql, ReadingStatus } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner-native'
import { match } from 'ts-pattern'

import { SystemAlert } from '~/components/ui/system-alert'
import { useTranslate } from '~/lib/hooks'

const deleteMutation = graphql(`
	mutation DeleteReadingSession($sessionId: Int!) {
		deleteReadingSession(sessionId: $sessionId)
	}
`)

const extendMutation = graphql(`
	mutation ExtendReadingSession($sessionId: Int!) {
		extendReadingSession(sessionId: $sessionId) {
			updatedAt
		}
	}
`)

type SessionRef = {
	id: number
	status: ReadingStatus
	mediaId: string
}

type Options = {
	onDeleted?: () => void
}

// TODO(reading-timeline): created this intending to put patch here too, but kinda just made more sense
// to keep it where used in the sheet. if i wind up not adding more, just rename this to useDelete... or sm

export function useReadingSessionMutations({ onDeleted }: Options = {}) {
	const { translate } = useTranslate()
	const client = useQueryClient()

	const { mutate: deleteSession } = useGraphQLMutation(deleteMutation, {
		onError: (error) => {
			toast.error(translate('shared.readingTimeline.deleteSession.failedToDelete'), {
				description: extractErrorMessage(error, 'An unknown error occurred'),
			})
		},
	})

	const { mutate: extendSession } = useGraphQLMutation(extendMutation, {
		onError: (error) => {
			toast.error(translate('shared.readingTimeline.extendMutation.failedToExtend'), {
				description: extractErrorMessage(error, 'An unknown error occurred'),
			})
		},
	})

	// TODO: would be better to have a little bit smarter invalidation here,
	// sessions feed into a lot of derived states so maybe unavoidable but
	// would be nice to have a more central place to trigger it ig
	const invalidateAfterMutation = (session: SessionRef) =>
		Promise.all([
			client.invalidateQueries({ queryKey: ['myReadingTimeline'], exact: false }),
			client.invalidateQueries({
				queryKey: ['mediaById', session.mediaId],
				exact: false,
			}),
			client.invalidateQueries({
				queryKey: ['bookById', session.mediaId],
				exact: false,
			}),
			client.invalidateQueries({ queryKey: ['sessionById'], exact: false }),
			client.invalidateQueries({ queryKey: ['continueReading'], exact: false }),
			client.invalidateQueries({ queryKey: ['onDeck'], exact: false }),
		])

	const getDeleteConfirmationMessage = (status: ReadingStatus) =>
		match(status)
			.with(ReadingStatus.Finished, () =>
				translate('shared.readingTimeline.deleteSession.finishedConfirm'),
			)
			.with(ReadingStatus.Abandoned, () =>
				translate('shared.readingTimeline.deleteSession.dnfedConfirm'),
			)
			.otherwise(() => translate('shared.readingTimeline.deleteSession.normalConfirm'))

	const confirmDeleteSession = (session: SessionRef) => {
		SystemAlert.alert(
			translate('shared.readingTimeline.deleteSession.label'),
			getDeleteConfirmationMessage(session.status),
			[
				{ text: translate('shared.common.cancel'), style: 'cancel' },
				{
					text: translate('shared.common.delete'),
					style: 'destructive',
					onPress: () =>
						deleteSession(
							{ sessionId: session.id },
							{
								onSuccess: async () => {
									onDeleted?.()
									await invalidateAfterMutation(session)
								},
							},
						),
				},
			],
		)
	}

	const confirmExtendSession = (session: SessionRef) => {
		SystemAlert.alert(
			translate('shared.readingTimeline.extendSession.label'),
			translate('shared.readingTimeline.extendSession.description'),
			[
				{ text: translate('shared.common.cancel'), style: 'cancel' },
				{
					text: translate('shared.common.extend'),
					style: 'destructive',
					onPress: () =>
						extendSession(
							{ sessionId: session.id },
							{
								onSuccess: async () => {
									await invalidateAfterMutation(session)
								},
							},
						),
				},
			],
		)
	}

	return { confirmDeleteSession, confirmExtendSession }
}
