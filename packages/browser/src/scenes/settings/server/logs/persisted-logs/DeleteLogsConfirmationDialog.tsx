import { queryClient, useGraphQLMutation, useSDK } from '@stump/client'
import { Alert, AlertDescription, Button, ConfirmationModal } from '@stump/components'
import { graphql, PersistedLogsQuery } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

const mutation = graphql(`
	mutation DeleteLogs {
		deleteLogs {
			deleted
		}
	}
`)

export default function DeleteLogsConfirmationDialog() {
	const { t } = useLocaleContext()
	const { sdk } = useSDK()

	const client = useQueryClient()

	const { mutate: deleteLogs } = useGraphQLMutation(mutation, {
		onSuccess: () => {
			client.refetchQueries({
				predicate: ({ queryKey }) => queryKey.includes(sdk.cacheKeys.logs),
			})
			setShowConfirmation(false)
		},
	})

	const [isEmptyState, setIsEmptyState] = useState(false)
	const [showConfirmation, setShowConfirmation] = useState(false)

	useEffect(() => {
		const unsubscribe = queryClient.getQueryCache().subscribe(({ query: { queryKey } }) => {
			if (queryKey.at(0) === sdk.cacheKeys.logs) {
				const cache = queryClient.getQueryData<PersistedLogsQuery>(queryKey)
				if (!cache || !cache.logs.nodes.length) {
					setIsEmptyState(true)
				} else {
					setIsEmptyState(false)
				}
			}
		})

		return () => {
			unsubscribe()
		}
	}, [sdk.cacheKeys.logs])

	return (
		<ConfirmationModal
			isOpen={showConfirmation}
			// @ts-expect-error: useGraphQLMutation types obv need fixing
			onConfirm={() => deleteLogs()}
			onClose={() => setShowConfirmation(false)}
			title={t(getKey('title'))}
			description={t(getKey('description'))}
			confirmText={t(getKey('confirm'))}
			confirmVariant="danger"
			trigger={
				<Button
					variant="secondary"
					onClick={() => setShowConfirmation(true)}
					disabled={isEmptyState}
				>
					{t(getKey('title'))}
				</Button>
			}
			size="md"
		>
			<Alert variant="warning" className="p-3 text-sm">
				<AlertDescription>{t(getKey('disclaimer'))} </AlertDescription>
			</Alert>
		</ConfirmationModal>
	)
}

const LOCALE_BASE = 'settingsScene.server/logs.sections.persistedLogs.deleteLogs'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
