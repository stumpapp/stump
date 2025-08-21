import { useGraphQLMutation, useSDK } from '@stump/client'
import { DropdownMenu, IconButton } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Database, Lock, MoreVertical, Pencil, Search, Trash, Unlock } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router'

import { useAppContext } from '@/context'
import paths from '@/paths'

import { User } from './UserTable'

const lockMutation = graphql(`
	mutation UserActionMenuLockUser($id: ID!, $lock: Boolean!) {
		updateUserLockStatus(id: $id, lock: $lock) {
			id
			isLocked
		}
	}
`)

const deleteSessionsMutation = graphql(`
	mutation UserActionMenuDeleteUserSessions($id: ID!) {
		deleteUserSessions(id: $id)
	}
`)

type Props = {
	user: User
	onSelectForInspect: (user: User) => void
	onSelectForDeletion: (user: User) => void
}

export default function UserActionMenu({ user, onSelectForInspect, onSelectForDeletion }: Props) {
	const { sdk } = useSDK()
	const { isServerOwner, user: byUser } = useAppContext()

	const client = useQueryClient()

	const { mutate: lockMutate } = useGraphQLMutation(lockMutation, {
		onSuccess: async () => {
			client.refetchQueries({ predicate: (query) => query.queryKey[0] === sdk.cacheKeys.users })
		},
		onError: (error) => {
			console.error(error)
			toast.error('An error occurred while locking the user')
		},
	})

	const { mutateAsync: deleteSessions } = useGraphQLMutation(deleteSessionsMutation, {
		onError: (error) => {
			console.error(error)
			toast.error('An error occurred while deleting user sessions')
		},
	})

	const navigate = useNavigate()
	const isSelf = byUser?.id === user.id

	const handleSetLockStatus = useCallback(
		async (lock: boolean) => lockMutate({ id: user.id, lock }),
		[lockMutate, user.id],
	)

	const handleClearUserSessions = useCallback(async () => {
		await deleteSessions({ id: user.id })
		if (isSelf) {
			navigate('/')
		} else {
			client.refetchQueries({ predicate: (query) => query.queryKey[0] === sdk.cacheKeys.users })
		}
	}, [client, deleteSessions, isSelf, navigate, sdk, user.id])

	const groups = useMemo(
		() => [
			{
				items: [
					{
						label: 'Inspect',
						leftIcon: <Search className="mr-2 h-4 w-4" />,
						onClick: () => onSelectForInspect(user),
					},
					{
						disabled: user.loginSessionsCount === 0,
						label: 'Clear sessions',
						leftIcon: <Database className="mr-2 h-4 w-4" />,
						onClick: handleClearUserSessions,
					},
				],
			},
			{
				items: [
					{
						label: 'Edit',
						disabled: isSelf,
						leftIcon: <Pencil className="mr-2 h-4 w-4" />,
						onClick: () => navigate(paths.updateUser(user.id)),
					},
					{
						disabled: isSelf,
						label: 'Delete',
						leftIcon: <Trash className="mr-2 h-4 w-4" />,
						onClick: () => onSelectForDeletion(user),
					},
					{
						disabled: isSelf || user.isServerOwner,
						label: `${user.isLocked ? 'Unlock' : 'Lock'} account`,
						leftIcon: user.isLocked ? (
							<Unlock className="mr-2 h-4 w-4" />
						) : (
							<Lock className="mr-2 h-4 w-4" />
						),
						onClick: () => handleSetLockStatus(!user.isLocked),
					},
				],
			},
		],

		[
			user,
			isSelf,
			navigate,
			onSelectForInspect,
			handleClearUserSessions,
			handleSetLockStatus,
			onSelectForDeletion,
		],
	)

	if (!isServerOwner) {
		return null
	}

	return (
		<DropdownMenu
			groups={groups}
			trigger={
				<IconButton size="xs" variant="ghost">
					<MoreVertical className="h-4 w-4" />
				</IconButton>
			}
			align="end"
		/>
	)
}
