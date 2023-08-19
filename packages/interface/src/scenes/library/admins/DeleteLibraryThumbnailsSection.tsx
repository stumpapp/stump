import { libraryApi } from '@stump/api'
import { Alert, Button, ConfirmationModal, Text } from '@stump/components'
import React, { useState } from 'react'
import { toast } from 'react-hot-toast'

type Props = {
	libraryId: string
}
export default function DeleteLibraryThumbnailsSection({ libraryId }: Props) {
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
			<ConfirmationModal
				title="Delete library thumbnails"
				description="Are you sure you want to delete all thumbnails for this library? This action cannot be undone."
				confirmText="Delete thumbnails"
				confirmVariant="danger"
				isOpen={showConfirmation}
				onClose={() => setShowConfirmation(false)}
				onConfirm={handleDeleteThumbnails}
				confirmIsLoading={isDeleting}
			/>

			<Alert level="error" rounded="sm" className="max-w-2xl dark:bg-red-300/25">
				<Alert.Content>
					<Text className="flex-shrink pb-4 text-sm dark:text-white md:mr-2 md:pb-0">
						You can delete all generated thumbnails associated with this library. On your next scan,
						they will be regenerated according to your thumbnail configuration.
					</Text>
					<Button
						type="button"
						variant="danger"
						onClick={() => setShowConfirmation(true)}
						className="flex-shrink-0"
						size="sm"
						disabled={justDeleted || isDeleting}
					>
						Delete thumbnails
					</Button>
				</Alert.Content>
			</Alert>
		</>
	)
}
