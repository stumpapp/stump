import { useGraphQLMutation, useSDK } from '@stump/client'
import { Button, CheckBox, Dialog } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'

import { User } from './UserTable'

const mutation = graphql(`
	mutation DeleteUser($id: ID!, $hardDelete: Boolean) {
		deleteUser(id: $id, hardDelete: $hardDelete) {
			id
		}
	}
`)

type Props = {
	deletingUser: User | null
	onClose: () => void
}

export default function DeleteUserModal({ deletingUser, onClose }: Props) {
	const { t } = useLocaleContext()
	const { sdk } = useSDK()

	const [hardDelete, setHardDelete] = useState(false)

	const client = useQueryClient()
	const { mutate, isPending } = useGraphQLMutation(mutation, {
		onSuccess: async () => {
			await client.refetchQueries({
				predicate: (query) => query.queryKey[0] === sdk.cacheKeys.users,
			})
			onClose()
		},
	})

	const handleDelete = useCallback(() => {
		if (deletingUser) {
			mutate({ id: deletingUser.id, hardDelete })
		}
	}, [deletingUser, hardDelete, mutate])

	return (
		<Dialog open={!!deletingUser}>
			<Dialog.Content size="sm">
				<Dialog.Header>
					<Dialog.Title>{t('settingsScene.server/users.table.delete.title')}</Dialog.Title>
					<Dialog.Description>
						{t('settingsScene.server/users.table.delete.description')}
					</Dialog.Description>
					<Dialog.Close onClick={onClose} disabled={isPending} />
				</Dialog.Header>

				<Dialog.Footer className="gap-3 sm:justify-between sm:gap-0 w-full items-center">
					<div className="shrink-0">
						<CheckBox
							label={t('settingsScene.server/users.table.delete.hardDelete')}
							checked={hardDelete}
							onClick={() => setHardDelete((prev) => !prev)}
						/>
					</div>

					<div className="space-y-2 sm:flex-row sm:justify-end sm:space-x-2 sm:space-y-0 flex w-full flex-col-reverse space-y-reverse">
						<Button variant="outline" onClick={onClose} disabled={isPending}>
							{t('common.cancel')}
						</Button>
						<Button isLoading={isPending} disabled={isPending} onClick={handleDelete}>
							{t('settingsScene.server/users.table.delete.confirm')}
						</Button>
					</div>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}
