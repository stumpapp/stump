import { useDeleteSmartListMutation } from '@stump/client'
import { ConfirmationModal } from '@stump/components'
import { isAxiosError } from '@stump/sdk'
import React from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router'

import paths from '@/paths'

import { useSmartListContext } from '../context'

type Props = {
	isOpen: boolean
	onClose: () => void
}
export default function DeleteSmartListConfirmation({ isOpen, onClose }: Props) {
	const navigate = useNavigate()

	const { list, viewerRole } = useSmartListContext()
	const { deleteAsync, isDeleting } = useDeleteSmartListMutation({
		onSuccess: () => {
			navigate(paths.smartLists())
		},
	})

	async function handleDelete() {
		if (viewerRole === 'CoCreator') {
			try {
				await deleteAsync(list.id)
				onClose()
			} catch (err) {
				console.error(err)

				if (isAxiosError(err)) {
					toast.error(err.message || 'An error occurred while deleting the list')
				} else {
					toast.error('An error occurred while deleting the list')
				}
			}
		} else {
			throw new Error('You do not have permission to delete this smart list')
		}
	}

	return (
		<ConfirmationModal
			title="Delete list"
			description="Are you sure you want to delete this list? This action cannot be undone."
			confirmText="Delete list"
			confirmVariant="danger"
			isOpen={isOpen}
			onClose={() => onClose()}
			onConfirm={handleDelete}
			confirmIsLoading={isDeleting}
		/>
	)
}
