import { useGraphQLMutation, useSuspenseGraphQLQueries } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import { UserAccessTable } from '@/components/library/accessControl/UserAccessTable'
import { useAppContext } from '@/context'

import { useLibraryContext } from '../../context'

const usersQuery = graphql(`
	query LibraryAccessUsersQuery {
		users(pagination: { none: { unpaginated: true } }) {
			nodes {
				id
				username
				avatarUrl
			}
		}
	}
`)

const allowedUsersQuery = graphql(`
	query LibraryAccessQuery($id: ID!) {
		libraryById(id: $id) {
			allowedUsers {
				id
				username
			}
		}
	}
`)

const mutation = graphql(`
	mutation UpdateLibraryAccess($id: ID!, $userIds: [String!]!) {
		updateLibraryAccess(id: $id, userIds: $userIds) {
			id
			allowedUsers {
				id
				username
			}
		}
	}
`)

export function LibraryAccess() {
	const { library } = useLibraryContext()
	const {
		user: { id: currentUserId },
	} = useAppContext()

	const client = useQueryClient()

	const [
		{
			data: {
				users: { nodes: allUsers },
			},
		},
		{
			data: { libraryById },
		},
	] = useSuspenseGraphQLQueries([
		{
			document: usersQuery,
			queryKey: ['users'],
		},
		{
			document: allowedUsersQuery,
			queryKey: ['libraryAccess', library.id],
			// @ts-expect-error: Need to fix this type error with useSuspenseGraphQLQueries
			variables: { id: library.id },
		},
	])

	const grantedIds = useMemo(
		() => new Set((libraryById?.allowedUsers || []).map((u) => u.id)),
		[libraryById],
	)

	const { mutate, isPending } = useGraphQLMutation(mutation, {
		onSuccess: ({ updateLibraryAccess: { allowedUsers } }) => {
			// update without refetching to reduce network
			client.setQueryData(['libraryAccess', library.id], {
				libraryById: { ...libraryById, allowedUsers },
			})
		},
	})

	const grantSelected = (ids: string[]) =>
		mutate({ id: library.id, userIds: [...new Set([...grantedIds, ...ids])] })

	const revokeSelected = (ids: string[]) =>
		mutate({
			id: library.id,
			userIds: [...grantedIds].filter((id) => id === currentUserId || !ids.includes(id)),
		})

	return (
		<UserAccessTable
			allUsers={allUsers}
			grantedIds={grantedIds}
			onGrant={grantSelected}
			onRevoke={revokeSelected}
			isPending={isPending}
		/>
	)
}
