import { useGraphQLMutation, useSDK } from '@stump/client'
import { Button, CheckBox, Dialog } from '@stump/components'
import { graphql } from '@stump/graphql'
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
					<Dialog.Title>Delete User Account</Dialog.Title>
					<Dialog.Description>
						Are you sure you want to delete this user? If you select the hard delete option, this
						user and all of their data will be permanently deleted.
					</Dialog.Description>
					<Dialog.Close onClick={onClose} disabled={isPending} />
				</Dialog.Header>

				<Dialog.Footer className="w-full items-center gap-3 sm:justify-between sm:gap-0">
					<div className="shrink-0">
						<CheckBox
							variant="primary"
							label="Hard Delete User"
							checked={hardDelete}
							onClick={() => setHardDelete((prev) => !prev)}
						/>
					</div>

					<div className="flex w-full flex-col-reverse space-y-2 space-y-reverse sm:flex-row sm:justify-end sm:space-x-2 sm:space-y-0">
						<Button onClick={onClose} disabled={isPending}>
							Cancel
						</Button>
						<Button
							variant="primary"
							isLoading={isPending}
							disabled={isPending}
							onClick={handleDelete}
						>
							Delete User
						</Button>
					</div>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}
