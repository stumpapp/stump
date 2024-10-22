import { Button, Dialog } from '@stump/components'
import React, { useState } from 'react'

// TODO(koreader): localize
export default function CreateAPIKeyModal() {
	const [isOpen, setIsOpen] = useState(false)

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<Dialog.Trigger asChild>
				<Button size="sm" variant="secondary">
					Create API key
				</Button>
			</Dialog.Trigger>

			<Dialog.Content size="md">
				<Dialog.Header>
					<Dialog.Title>Create API key</Dialog.Title>
					<Dialog.Description>
						API keys are long-lived credentials that can be used to authenticate with the API
					</Dialog.Description>
				</Dialog.Header>

				<Dialog.Footer>
					<Button onClick={() => setIsOpen(false)} size="sm">
						Cancel
					</Button>
					<Button variant="primary" size="sm">
						Create key
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}
