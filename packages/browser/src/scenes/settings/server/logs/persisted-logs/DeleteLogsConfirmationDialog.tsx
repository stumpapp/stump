import { queryClient, useMutation, useSDK } from '@stump/client'
import { Alert, Button, ConfirmationModal } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Log } from '@stump/sdk'
import { useEffect, useState } from 'react'

export default function DeleteLogsConfirmationDialog() {
	const { t } = useLocaleContext()

	const { sdk } = useSDK()
	const { mutate: clearLogs } = useMutation([sdk.log.keys.clear], () => sdk.log.clear(), {
		onSuccess: () => queryClient.invalidateQueries([sdk.log.keys.get]),
	})

	const [isEmptyState, setIsEmptyState] = useState(false)
	const [showConfirmation, setShowConfirmation] = useState(false)

	useEffect(() => {
		const unsubscribe = queryClient.getQueryCache().subscribe(({ query: { queryKey } }) => {
			const [baseKey] = queryKey
			if (baseKey === sdk.log.keys.clear) {
				const logs = queryClient.getQueryData<Log[]>(queryKey)
				if (!logs?.length) {
					setIsEmptyState(true)
				} else {
					setIsEmptyState(false)
				}
			}
		})

		return () => {
			unsubscribe()
		}
	}, [sdk.log.keys.clear])

	return (
		<ConfirmationModal
			isOpen={showConfirmation}
			onConfirm={() => {
				clearLogs()
				setShowConfirmation(false)
			}}
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
			<Alert level="warning" className="p-3 text-sm">
				<Alert.Content>{t(getKey('disclaimer'))} </Alert.Content>
			</Alert>
		</ConfirmationModal>
	)
}

const LOCALE_BASE = 'settingsScene.server/logs.sections.persistedLogs.deleteLogs'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
