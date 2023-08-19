import { DropdownMenu, IconButton } from '@stump/components'
import { User } from '@stump/types'
import { MoreVertical, Pencil, Trash } from 'lucide-react'
import React, { useMemo } from 'react'

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
		],
		[setDeletingUser, user, isSelf],
	)

	if (!isServerOwner) {
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
