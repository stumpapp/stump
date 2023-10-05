import { userApi, userQueryKeys } from '@stump/api'
import { invalidateQueries } from '@stump/client'
import { DropdownMenu, IconButton } from '@stump/components'
import { User } from '@stump/types'
import { Lock, MoreVertical, Pencil, Trash, Unlock } from 'lucide-react'
import React, { useMemo } from 'react'
import toast from 'react-hot-toast'

import { useAppContext } from '../../../../context.ts'
import { noop } from '../../../../utils/misc.ts'
import { useUserManagementContext } from '../context.ts'

type Props = {
	user: User
}

export default function UserActionMenu({ user }: Props) {
	const { isServerOwner, user: byUser } = useAppContext()
	const { setDeletingUser } = useUserManagementContext()

	const isSelf = byUser?.id === user.id

	const handleSetLockStatus = async (lock: boolean) => {
		try {
			await userApi.setLockStatus(user.id, lock)
			await invalidateQueries({ keys: [userQueryKeys.getUsers] })
		} catch (error) {
			if (error instanceof Error) {
				toast.error(error.message)
			} else {
				console.error(error)
				toast.error('An unknown error occurred')
			}
		}
	}

	const items = useMemo(
		() => [
			{
				disabled: true,
				label: 'Edit',
				leftIcon: <Pencil className="mr-2 h-4 w-4" />,
				onClick: noop,
			},
			{
				disabled: isSelf,
				label: 'Delete',
				leftIcon: <Trash className="mr-2 h-4 w-4" />,
				onClick: () => setDeletingUser(user),
			},
			{
				disabled: isSelf || user.role === 'SERVER_OWNER',
				label: `${user.is_locked ? 'Unlock' : 'Lock'} account`,
				leftIcon: user.is_locked ? (
					<Unlock className="mr-2 h-4 w-4" />
				) : (
					<Lock className="mr-2 h-4 w-4" />
				),
				onClick: () => handleSetLockStatus(!user.is_locked),
			},
		],
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[setDeletingUser, user, isSelf],
	)

	if (!isServerOwner || isSelf) {
		return null
	}

	return (
		<DropdownMenu
			groups={[
				{
					items,
				},
			]}
			trigger={
				<IconButton size="xs" variant="ghost">
					<MoreVertical className="h-4 w-4" />
				</IconButton>
			}
			align="end"
		/>
	)
}
