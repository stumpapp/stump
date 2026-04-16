import { useGraphQLMutation } from '@stump/client'
import { TypeToConfirmModal } from '@stump/components'
import { graphql, UserPermission } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
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

const LOCALE_KEY = 'common.deleteConfirmation'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`

type Props = {
	libraryId: string
	libraryName: string
	onClose: () => void
	isOpen: boolean
	trigger?: React.ReactNode
}

export default function DeleteLibraryConfirmation({
	isOpen,
	libraryId,
	libraryName,
	onClose,
	trigger,
}: Props) {
	const navigate = useNavigate()
	const client = useQueryClient()
	const { t } = useLocaleContext()

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

	const entityI18nValues = { name: libraryName, type: 'library' }

	return (
		<TypeToConfirmModal
			title={t(getKey('title'), entityI18nValues)}
			description={t(getKey('description'), entityI18nValues)}
			confirmText={t(getKey('confirm'), entityI18nValues)}
			confirmVariant="danger"
			isOpen={isOpen}
			onClose={onClose}
			onConfirm={handleDelete}
			confirmIsLoading={isPending}
			trigger={trigger}
			confirmationValue={libraryName}
			instructionText={t(getKey('typeToConfirm'), entityI18nValues)}
		/>
	)
}
