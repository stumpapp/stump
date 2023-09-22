import { libraryApi } from '@stump/api'
import { Button, ConfirmationModal } from '@stump/components'
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
		<div>
			<ConfirmationModal
				title="Delete library thumbnails"
				description="Are you sure you want to delete all thumbnails for this library? You will have to manually regenerate them."
				confirmText="Delete thumbnails"
				confirmVariant="danger"
				isOpen={showConfirmation}
				onClose={() => setShowConfirmation(false)}
				onConfirm={handleDeleteThumbnails}
				confirmIsLoading={isDeleting}
			/>

			<Button
				type="button"
				variant="danger"
				onClick={() => setShowConfirmation(true)}
				className="flex-shrink-0"
				size="md"
				disabled={justDeleted || isDeleting}
			>
				Delete thumbnails
			</Button>
		</div>
	)
}
