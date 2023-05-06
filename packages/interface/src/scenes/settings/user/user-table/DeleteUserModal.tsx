import { userQueryKeys } from '@stump/api'
import { invalidateQueries, useDeleteUser, useUser } from '@stump/client'
import { Button, CheckBox, Dialog } from '@stump/components'
import { Trash } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'react-hot-toast'

import { useUserManagementContext } from '../context'

export default function DeleteUserModal() {
	const { user } = useUser()
	const { selectedUser, setSelectedUser } = useUserManagementContext()

	const [isOpen, setIsOpen] = useState(false)
	const [hardDelete, setHardDelete] = useState(false)

	const { deleteAsync, isLoading: isDeletingUser } = useDeleteUser({
		hardDelete,
		userId: selectedUser?.id || '',
	})

	const handleOpenStateChange = () => {
		if (isOpen && isDeletingUser) {
			return
		}

		setIsOpen((prev) => !prev)
	}

	const handleDelete = async () => {
		if (!selectedUser) {
			return
		} else if (!!user && user.id === selectedUser.id) {
			toast.error('You cannot delete your own account')
		} else if (selectedUser.role === 'SERVER_OWNER') {
			toast.error('You cannot delete the server owner')
		} else {
			try {
				await deleteAsync()
				await invalidateQueries({ queryKey: [userQueryKeys.getUsers] })
				setSelectedUser(null)
				setIsOpen(false)
			} catch (error) {
				console.error(error)
				toast.error('Failed to delete user')
			}
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenStateChange}>
			<Dialog.Trigger asChild>
				<Button variant="danger" size="sm" disabled={!selectedUser}>
					<Trash className="mr-1.5 h-4 w-4" />
					Delete User
				</Button>
			</Dialog.Trigger>
			<Dialog.Content size="sm">
				<Dialog.Header>
					<Dialog.Title>Delete User Account</Dialog.Title>
					<Dialog.Description>
						Are you sure you want to delete this user? If you select the hard delete option, this
						user and all of their data will be permanently deleted.
					</Dialog.Description>
					<Dialog.Close disabled={isDeletingUser} />
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
						<Button onClick={() => setIsOpen(false)} disabled={isDeletingUser}>
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
