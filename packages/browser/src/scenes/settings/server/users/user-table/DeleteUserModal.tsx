import { invalidateQueries, useDeleteUser, useSDK } from '@stump/client'
import { Button, CheckBox, Dialog } from '@stump/components'
import { useState } from 'react'
import { toast } from 'react-hot-toast'

import { useUser } from '@/stores'

import { useUserManagementContext } from '../context'

export default function DeleteUserModal() {
	const { sdk } = useSDK()
	const { user } = useUser()
	const { deletingUser, setDeletingUser } = useUserManagementContext()

	const [hardDelete, setHardDelete] = useState(false)

	const { deleteAsync, isLoading: isDeletingUser } = useDeleteUser({
		hardDelete,
		userId: deletingUser?.id || '',
	})

	const handleDelete = async () => {
		if (!deletingUser) {
			return
		} else if (!!user && user.id === deletingUser.id) {
			toast.error('You cannot delete your own account')
		} else if (deletingUser.is_server_owner) {
			toast.error('You cannot delete the server owner')
		} else {
			try {
				await deleteAsync()
				await invalidateQueries({ exact: false, queryKey: [sdk.user.keys.get] })
				setDeletingUser(null)
			} catch (error) {
				console.error(error)
				toast.error('Failed to delete user')
			}
		}
	}

	return (
		<Dialog open={!!deletingUser}>
			<Dialog.Content size="sm">
				<Dialog.Header>
					<Dialog.Title>Delete User Account</Dialog.Title>
					<Dialog.Description>
						Are you sure you want to delete this user? If you select the hard delete option, this
						user and all of their data will be permanently deleted.
					</Dialog.Description>
					<Dialog.Close onClick={() => setDeletingUser(null)} disabled={isDeletingUser} />
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
						<Button onClick={() => setDeletingUser(null)} disabled={isDeletingUser}>
							Cancel
						</Button>
						<Button
							variant="primary"
							isLoading={isDeletingUser}
							disabled={isDeletingUser}
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
