import { useSDK } from '@stump/client'
import { Alert, Button, Dialog } from '@stump/components'
import { handleApiError } from '@stump/sdk'
import React, { useState } from 'react'
import { useNavigate } from 'react-router'

import paths from '@/paths'

type DeleteBookConfirmationProps = {
	id: string
	trigger?: React.ReactNode
}

export default function DeleteBookConfirmation({ id, trigger }: DeleteBookConfirmationProps) {
	const navigate = useNavigate()
	const { sdk } = useSDK()
	const [error, setError] = useState<unknown>(null)
	const [isOpen, setIsOpen] = useState(false)

	const handleDelete = async () => {
		setError(null)
		try {
			await sdk.media.delete(id)
			navigate(paths.libraries())
		} catch (err) {
			setError(err)
		} finally {
			setIsOpen(false)
		}
	}

	const renderError = () => {
		if (!error) return null

		const message = handleApiError(error)
		return (
			<Alert level="error">
				<Alert.Content>{message}</Alert.Content>
			</Alert>
		)
	}

	return (
		<Dialog open={isOpen} onOpenChange={(nowOpen) => setIsOpen(nowOpen)}>
			{trigger && (
				<Dialog.Trigger asChild={typeof trigger !== 'string'}>
					{typeof trigger === 'string' ? <Button variant="danger">{trigger}</Button> : trigger}
				</Dialog.Trigger>
			)}
			<Dialog.Content size="sm">
				<Dialog.Header>
					<Dialog.Title>Delete Book</Dialog.Title>
					<Dialog.Description>
						Are you sure you want to delete this book? This action cannot be undone.
					</Dialog.Description>
					<Dialog.Close onClick={() => setIsOpen(false)} />
				</Dialog.Header>
				{renderError()}
				<Dialog.Footer>
					<Button variant="ghost" onClick={() => setIsOpen(false)}>
						Cancel
					</Button>
					<Button variant="danger" onClick={handleDelete}>
						Delete Book
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}
