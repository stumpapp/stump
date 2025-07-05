import { useGraphQLMutation, useSDK } from '@stump/client'
import { Button, ConfirmationModal, Text } from '@stump/components'
import { graphql, JobTableQuery } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

const mutation = graphql(`
	mutation DeleteJobHistoryConfirmation {
		deleteJobHistory {
			affectedRows
		}
	}
`)

export default function DeleteJobHistoryConfirmation() {
	const { t } = useLocaleContext()
	const { sdk } = useSDK()

	const client = useQueryClient()

	const { mutate: deleteLogs } = useGraphQLMutation(mutation, {
		onSuccess: () => {
			client.refetchQueries({
				predicate: ({ queryKey }) => queryKey.includes(sdk.cacheKeys.jobs),
			})
			setShowConfirmation(false)
		},
	})

	const [isEmptyState, setIsEmptyState] = useState(false)
	const [showConfirmation, setShowConfirmation] = useState(false)

	useEffect(() => {
		const unsubscribe = client.getQueryCache().subscribe(({ query: { queryKey } }) => {
			if (queryKey.at(0) === sdk.cacheKeys.jobs) {
				const cache = client.getQueryData<JobTableQuery>(queryKey)
				if (!cache || !cache.jobs.nodes.length) {
					setIsEmptyState(true)
				} else {
					setIsEmptyState(false)
				}
			}
		})

		return () => {
			unsubscribe()
		}
	}, [sdk.cacheKeys.jobs, client])

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
			<Text>{t(getKey('confirmText'))}</Text>
		</ConfirmationModal>
	)
}

const LOCALE_BASE = 'settingsScene.server/jobs.sections.history.deleteJobHistory'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
