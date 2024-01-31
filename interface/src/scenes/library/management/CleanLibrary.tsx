import { libraryApi } from '@stump/api'
import { Button, ConfirmationModal } from '@stump/components'
import React, { useState } from 'react'
import { toast } from 'react-hot-toast'

type Props = {
	libraryId: string
}
export default function CleanLibrary({ libraryId }: Props) {
	const [justCleaned, setJustCleaned] = useState(false)
	const [showConfirmation, setShowConfirmation] = useState(false)
	const [isCleaning, setIsCleaning] = useState(false)

	const handleDeleteThumbnails = async () => {
		try {
			setIsCleaning(true)
			const { data } = await libraryApi.cleanLibrary(libraryId)
			setJustCleaned(true)
			toast.success(
				`Cleaned ${data.deleted_media_count} media and ${data.deleted_series_count} series`,
			)
			if (data.is_empty) {
				toast('The library is now empty')
			}
			setShowConfirmation(false)
		} catch (error) {
			console.error(error)
			const fallbackMessage = 'An error occurred while cleaning the library'
			if (error instanceof Error) {
				toast.error(error.message || fallbackMessage)
			} else {
				toast.error(fallbackMessage)
			}
		} finally {
			setIsCleaning(false)
		}
	}

	return (
		<div>
			<ConfirmationModal
				title="Clean library"
				description="Cleaning the library will remove all media and series that are not in a READY state. Are you sure you want to clean this library?"
				confirmText="Clean library"
				confirmVariant="danger"
				isOpen={showConfirmation}
				onClose={() => setShowConfirmation(false)}
				onConfirm={handleDeleteThumbnails}
				confirmIsLoading={isCleaning}
			/>

			<Button
				type="button"
				variant="danger"
				onClick={() => setShowConfirmation(true)}
				className="flex-shrink-0"
				size="md"
				disabled={justCleaned || isCleaning}
				isLoading={isCleaning}
			>
				Clean library
			</Button>
		</div>
	)
}
