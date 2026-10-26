import { useGraphQLMutation, useSDK } from '@stump/client'
import { Alert, AlertTitle, Button, ConfirmationModal } from '@stump/components'
import { graphql, JobTableQuery } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useTranslate } from '@/hooks/useTranslate'

const mutation = graphql(`
	mutation DeleteJobHistoryConfirmation {
		deleteJobHistory {
			affectedRows
		}
	}
`)

export default function DeleteJobHistoryConfirmation() {
	const { t, translate } = useTranslate()
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
			confirmVariant="destructive"
			trigger={
				<Button
					variant="destructive"
					onClick={() => setShowConfirmation(true)}
					disabled={isEmptyState}
				>
					{t(getKey('title'))}
				</Button>
			}
		>
			<Alert>
				<AlertTriangle />
				<AlertTitle>{translate('shared.common.thisActionCannotBeUndone')}</AlertTitle>
			</Alert>
		</ConfirmationModal>
	)
}

const LOCALE_BASE = 'settingsScene.server/jobs.sections.history.deleteJobHistory'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
