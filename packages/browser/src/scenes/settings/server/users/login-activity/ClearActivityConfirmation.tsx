import { useGraphQLMutation, useSDK } from '@stump/client'
import { Button, ConfirmationModal } from '@stump/components'
import { graphql, LoginActivityTableQuery } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

const mutation = graphql(`
	mutation ClearLoginActivityConfirmation {
		deleteLoginActivity
	}
`)

export default function ClearLoginActivityConfirmation() {
	const { t } = useLocaleContext()
	const { sdk } = useSDK()

	const client = useQueryClient()

	const { mutate: deleteActivity } = useGraphQLMutation(mutation, {
		onSuccess: () => {
			client.refetchQueries({
				predicate: ({ queryKey }) => queryKey.includes(sdk.cacheKeys.loginActivity),
			})
			setShowConfirmation(false)
		},
	})

	const [isEmptyState, setIsEmptyState] = useState(false)
	const [showConfirmation, setShowConfirmation] = useState(false)

	useEffect(() => {
		const unsubscribe = client.getQueryCache().subscribe(({ query: { queryKey } }) => {
			if (queryKey.at(0) === sdk.cacheKeys.loginActivity) {
				const cache = client.getQueryData<LoginActivityTableQuery>(queryKey)
				if (!cache || !cache.loginActivity.length) {
					setIsEmptyState(true)
				} else {
					setIsEmptyState(false)
				}
			}
		})

		return () => {
			unsubscribe()
		}
	}, [sdk.cacheKeys.loginActivity, client])

	return (
		<ConfirmationModal
			isOpen={showConfirmation}
			// @ts-expect-error: useGraphQLMutation types obv need fixing
			onConfirm={() => deleteActivity()}
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
			size="sm"
		/>
	)
}

const LOCALE_BASE = 'settingsScene.server/users.loginActivity.deleteConfirmation'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
