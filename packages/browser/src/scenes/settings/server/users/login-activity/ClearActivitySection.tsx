import { invalidateQueries, useSDK } from '@stump/client'
import { Alert, Button } from '@stump/components'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'react-hot-toast'

import { useAppContext } from '@/context'

export default function ClearActivitySection() {
	const { sdk } = useSDK()
	const { isServerOwner } = useAppContext()

	if (!isServerOwner) return null

	/**
	 * Delete all job reports from the database
	 */
	const handleClearHistory = async () => {
		try {
			await sdk.user.deleteLoginActivity()
		} catch (error) {
			if (error instanceof Error) {
				toast.error(error.message)
			} else {
				console.error(error)
				toast.error('An unknown error occurred')
			}
		} finally {
			await invalidateQueries({ keys: [sdk.user.keys.loginActivity] })
		}
	}

	return (
		<Alert level="error" icon={AlertTriangle}>
			<Alert.Content className="flex flex-col gap-3 md:flex-row">
				Login activity can be cleared and deleted from the database at any time.
				<Button
					variant="danger"
					onClick={handleClearHistory}
					disabled={!isServerOwner}
					className="flex-shrink-0"
				>
					Clear activity
				</Button>
			</Alert.Content>
		</Alert>
	)
}
