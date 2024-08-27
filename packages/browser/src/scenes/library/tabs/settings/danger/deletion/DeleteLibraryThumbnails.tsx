import { libraryApi } from '@stump/api'
import { Alert, Button, ConfirmationModal } from '@stump/components'
import { AlertTriangle } from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'react-hot-toast'

type Props = {
	libraryId: string
}
export default function DeleteLibraryThumbnails({ libraryId }: Props) {
	// This is a naive way to prevent the user from deleting the thumbnails multiple times
	// in a row. I don't feel it would be worth it to implement a more robust solution.
	const [justDeleted, setJustDeleted] = useState(false)
	const [showConfirmation, setShowConfirmation] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)

	const handleDeleteThumbnails = async () => {
		try {
			setIsDeleting(true)
			await libraryApi.deleteLibraryThumbnails(libraryId)
			setJustDeleted(true)
			toast.success('Library thumbnails deleted')
		} catch (error) {
			console.error(error)
			const fallbackMessage = 'An error occurred while deleting the library thumbnails'
			if (error instanceof Error) {
				toast.error(error.message || fallbackMessage)
			} else {
				toast.error(fallbackMessage)
			}
		} finally {
			setIsDeleting(false)
		}
	}

	return (
		<>
			<Alert level="error" rounded="sm" icon={AlertTriangle}>
				<Alert.Content className="flex flex-col gap-3 md:flex-row">
					Delete all generated thumbnails for this library
					<Button
						variant="danger"
						onClick={() => setShowConfirmation(true)}
						className="flex-shrink-0"
						disabled={justDeleted || isDeleting}
						size="md"
					>
						Delete thumbnails
					</Button>
				</Alert.Content>
			</Alert>

			<ConfirmationModal
				title="Delete library thumbnails"
				description="Are you sure you want to delete all thumbnails for this library? You will have to manually regenerate them."
				confirmText="Delete thumbnails"
				confirmVariant="danger"
				isOpen={showConfirmation && !justDeleted}
				onClose={() => setShowConfirmation(false)}
				onConfirm={handleDeleteThumbnails}
				confirmIsLoading={isDeleting}
			/>
		</>
	)
}
