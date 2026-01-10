import { useGraphQLMutation } from '@stump/client'
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	ConfirmationModal,
	Heading,
	Text,
} from '@stump/components'
import { graphql } from '@stump/graphql'
import { AlertTriangle } from 'lucide-react'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { useLibraryManagement } from '../../context'

const mutation = graphql(`
	mutation DeleteLibraryThumbnails($id: ID!) {
		deleteLibraryThumbnails(id: $id)
	}
`)

export default function DeleteLibraryThumbnails() {
	const {
		library: { id },
	} = useLibraryManagement()

	// This is a naive way to prevent the user from deleting the thumbnails multiple times
	// in a row. I don't feel it would be worth it to implement a more robust solution.
	const [showConfirmation, setShowConfirmation] = useState(false)

	const { mutateAsync: deleteThumbnails, isPending, data } = useGraphQLMutation(mutation)

	const handleDeleteThumbnails = useCallback(async () => {
		try {
			await deleteThumbnails({ id })
			toast.success('Library thumbnails deleted')
		} catch (error) {
			console.error(error)
			const fallbackMessage = 'An error occurred while deleting the library thumbnails'
			if (error instanceof Error) {
				toast.error(error.message || fallbackMessage)
			} else {
				toast.error(fallbackMessage)
			}
		}
	}, [id, deleteThumbnails])

	return (
		<>
			<div>
				<Heading size="sm">Delete thumbnails</Heading>
				<Text size="sm" variant="muted">
					Remove all generated thumbnails for this library
				</Text>
			</div>

			<div className="flex">
				<Button
					variant="danger"
					onClick={() => setShowConfirmation(true)}
					className="flex-shrink-0"
					disabled={isPending || !!data}
					size="md"
				>
					Delete thumbnails
				</Button>
			</div>

			<ConfirmationModal
				title="Delete library thumbnails"
				description="Are you sure you want to delete all thumbnails for this library?"
				confirmText="Delete thumbnails"
				confirmVariant="danger"
				isOpen={showConfirmation && !data}
				onClose={() => setShowConfirmation(false)}
				onConfirm={handleDeleteThumbnails}
				confirmIsLoading={isPending}
				size="md"
			>
				<Alert variant="warning">
					<AlertTriangle />
					<AlertTitle>This cannot be undone</AlertTitle>
					<AlertDescription>
						Deleting the library thumbnails will remove all generated images and you will have to
						manually regenerate them
					</AlertDescription>
				</Alert>
			</ConfirmationModal>
		</>
	)
}
