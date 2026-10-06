import { useGraphQLMutation } from '@stump/client'
import { extractErrorMessage, graphql, ReadingStatus } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner-native'
import { match } from 'ts-pattern'

import { SystemAlert } from '~/components/ui/system-alert'
import { useTranslate } from '~/lib/hooks'

const mutation = graphql(`
	mutation DeleteReadingSession($sessionId: Int!) {
		deleteReadingSession(sessionId: $sessionId)
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

// TODO(reading-timeline): obv translate all of this after i sort the translation organization stuff out
// TODO(reading-timeline): created this intending to put patch here too, but kinda just made more sense
// to keep it where used in the sheet. if i wind up not adding more, just rename this to useDelete... or sm

export function useReadingSessionMutations({ onDeleted }: Options = {}) {
	const { t } = useTranslate()
	const client = useQueryClient()

	const { mutate: deleteSession } = useGraphQLMutation(mutation, {
		onError: (error) => {
			toast.error('Failed to delete session', {
				description: extractErrorMessage(error, 'An unknown error occurred'),
			})
		},
	})

	const getConfirmationMessage = (status: ReadingStatus) =>
		match(status)
			.with(
				ReadingStatus.Finished,
				() =>
					'This session completes a readthrough, so deleting it will will greatly change your timeline and cannot be undone. Are you sure?',
			)
			.with(
				ReadingStatus.Abandoned,
				() =>
					'This session completes a DNF readthrough, so deleting it will will greatly change your timeline and cannot be undone. Are you sure?',
			)
			.otherwise(() => 'This will permanently remove the session from your timeline. Are you sure?')

	const confirmDeleteSession = (session: SessionRef) => {
		SystemAlert.alert('Delete Session', getConfirmationMessage(session.status), [
			{ text: t('common.cancel'), style: 'cancel' },
			{
				text: t('common.delete'),
				style: 'destructive',
				onPress: () =>
					deleteSession(
						{ sessionId: session.id },
						{
							onSuccess: async () => {
								onDeleted?.()
								// TODO: would be better to have a little bit smarter invalidation here,
								// sessions feed into a lot of derived states so maybe unavoidable but
								// would be nice to have a more central place to trigger it ig
								await Promise.all([
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
							},
						},
					),
			},
		])
	}

	return { confirmDeleteSession }
}
