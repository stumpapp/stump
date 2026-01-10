import { useGraphQLMutation } from '@stump/client'
import { ConfirmationModal } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import paths from '../../paths'

const mutation = graphql(`
	mutation DeleteBookClubConfirmation($id: ID!) {
		deleteBookClub(id: $id) {
			id
		}
	}
`)

type Props = {
	id: string
	onClose: () => void
	isOpen: boolean
	trigger?: React.ReactNode
}

export default function DeleteBookClubConfirmation({ isOpen, id, onClose, trigger }: Props) {
	const navigate = useNavigate()

	const { mutate: deleteClub, isPending } = useGraphQLMutation(mutation, {
		onSuccess: () => {
			onClose()
			navigate(paths.bookClubs())
		},
		onError: (error) => {
			console.error('Error deleting book club:', error)
			toast.error('Failed to delete book club')
		},
	})

	return (
		<ConfirmationModal
			title="Delete book club"
			description="Are you sure you want to delete this club? This action cannot be undone."
			confirmText="Delete club"
			confirmVariant="danger"
			isOpen={isOpen}
			onClose={onClose}
			onConfirm={() => deleteClub({ id })}
			confirmIsLoading={isPending}
			trigger={trigger}
		/>
	)
}
