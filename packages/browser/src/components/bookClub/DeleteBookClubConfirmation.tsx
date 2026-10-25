import { useGraphQLMutation } from '@stump/client'
import { ConfirmationModal } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { useTranslate } from '@/hooks/useTranslate'

import { usePaths } from '../../paths'

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
	const { t } = useTranslate()
	const paths = usePaths()
	const navigate = useNavigate()

	const { mutate: deleteClub, isPending } = useGraphQLMutation(mutation, {
		onSuccess: () => {
			onClose()
			navigate(paths.bookClubs())
		},
		onError: (error) => {
			console.error('Error deleting book club:', error)
			toast.error(
				t('bookClubSettingsScene.danger-zone/delete.sections.deleteClub.errors.failedToDelete'),
			)
		},
	})

	return (
		<ConfirmationModal
			title={t(getKey('title'))}
			description={t(getKey('description'))}
			confirmText={t(getKey('confirm'))}
			confirmVariant="destructive"
			isOpen={isOpen}
			onClose={onClose}
			onConfirm={() => deleteClub({ id })}
			confirmIsLoading={isPending}
			trigger={trigger}
		/>
	)
}

const LOCALE_KEY = 'bookClubSettingsScene.danger-zone/delete.sections.deleteClub.confirmation'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
