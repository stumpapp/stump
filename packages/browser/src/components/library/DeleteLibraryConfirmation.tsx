import { useGraphQLMutation } from '@stump/client'
import { ConfirmationModal } from '@stump/components'
import { graphql, UserPermission } from '@stump/graphql'
import { isAxiosError } from '@stump/sdk'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { useAppContext } from '@/context'
import paths from '@/paths'

const mutation = graphql(`
	mutation DeleteLibrary($id: ID!) {
		deleteLibrary(id: $id) {
			id
		}
	}
`)

type Props = {
	libraryId: string
	onClose: () => void
	isOpen: boolean
	trigger?: React.ReactNode
}

export default function DeleteLibraryConfirmation({ isOpen, libraryId, onClose, trigger }: Props) {
	const navigate = useNavigate()
	const client = useQueryClient()

	const {
		mutate: deleteLibrary,
		isPending,
		error,
	} = useGraphQLMutation(mutation, {
		onSuccess: async () => {
			await client.invalidateQueries({
				predicate: () => true,
			})
			onClose()
			navigate(paths.home())
		},
	})
	const { checkPermission } = useAppContext()

	const isPermitted = useMemo(
		() => checkPermission(UserPermission.DeleteLibrary),
		[checkPermission],
	)

	const handleDelete = useCallback(() => {
		if (isPermitted) {
			deleteLibrary({ id: libraryId })
		}
	}, [deleteLibrary, isPermitted, libraryId])

	useEffect(() => {
		if (!error) return

		console.error(error)
		if (isAxiosError(error)) {
			toast.error(error.message || 'An error occurred while deleting the library')
		} else {
			toast.error('An error occurred while deleting the library')
		}
	}, [error])

	return (
		<ConfirmationModal
			title="Delete Library"
			description="Are you sure you want to delete this library? This action cannot be undone."
			confirmText="Delete Library"
			confirmVariant="danger"
			isOpen={isOpen}
			onClose={onClose}
			onConfirm={handleDelete}
			confirmIsLoading={isPending}
			trigger={trigger}
		/>
	)
}
