import { Alert, Button, Heading, Text } from '@stump/components'
import React, { useState } from 'react'

import DeleteSmartListConfirmation from './DeleteSmartListConfirmation'

export default function DangerSection() {
	const [showConfirmation, setShowConfirmation] = useState(false)

	return (
		<>
			<div className="flex flex-col gap-y-6">
				<div>
					<Heading size="md">Danger</Heading>
					<Text variant="muted" size="sm">
						Destructive actions that cannot be undone
					</Text>
				</div>

				<Alert level="error" icon="warning" rounded="sm" alignIcon="start">
					<Alert.Content>
						<div className="-mt-1 flex flex-col">
							<Heading size="xs">Delete smart list</Heading>
							<Text className="text-opacity-80" size="sm">
								Permanently delete this smart list. This action cannot be undone
							</Text>
						</div>
						<Button variant="danger" onClick={() => setShowConfirmation(true)}>
							Delete
						</Button>
					</Alert.Content>
				</Alert>
			</div>

			<DeleteSmartListConfirmation
				isOpen={showConfirmation}
				onClose={() => setShowConfirmation(false)}
			/>
		</>
	)
}
