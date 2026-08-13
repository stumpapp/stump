import { useGraphQLMutation, useSuspenseGraphQLQueries } from '@stump/client'
import {
	Alert,
	AlertDescription,
	AlertTitle,
	ComboBox,
	Heading,
	Text,
	usePrevious,
} from '@stump/components'
import { graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDebouncedValue } from 'rooks'

import { useAppContext } from '@/context'

import { useLibraryContext } from '../../../../context'

const usersQuery = graphql(`
	query LibraryAccessUsersQuery {
		users(pagination: { none: { unpaginated: true } }) {
			nodes {
				id
				username
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

export default function LibraryAccess() {
	const { library } = useLibraryContext()
	const { user } = useAppContext()
	const { t } = useLocaleContext()

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
	const allowedUsers = useMemo(() => libraryById?.allowedUsers || [], [libraryById])

	const client = useQueryClient()

	const { mutate } = useGraphQLMutation(mutation, {
		onSuccess: ({ updateLibraryAccess: { allowedUsers } }) => {
			// Update without refetching to reduce network
			client.setQueryData(['libraryAccess', library.id], {
				libraryById: {
					...libraryById,
					allowedUsers,
				},
			})
		},
	})

	const updateGrants = useCallback(
		(ids: string[]) => {
			mutate({ id: library.id, userIds: ids })
		},
		[mutate, library],
	)

	const [grantedUserIds, setGrantedUserIds] = useState<string[] | undefined>(() =>
		allowedUsers?.map((user) => user.id),
	)
	const [debouncedUserIds] = useDebouncedValue(grantedUserIds, 500)

	useEffect(() => {
		setGrantedUserIds(allowedUsers?.map((user) => user.id) || [])
	}, [allowedUsers])

	const previousLibrary = usePrevious(library)
	const isSameLibrary = previousLibrary?.id === library.id
	const variablesLoaded = !!debouncedUserIds && !!allowedUsers
	const shouldCall =
		variablesLoaded && debouncedUserIds.length !== allowedUsers.length && isSameLibrary

	useEffect(() => {
		if (shouldCall) {
			updateGrants(debouncedUserIds)
		}
	}, [debouncedUserIds, updateGrants, shouldCall])

	const userOptions = useMemo(
		() =>
			(allUsers?.map((user) => ({ label: user.username, value: user.id })) || []).filter(
				(option) => option.value !== user.id,
			),
		[allUsers, user],
	)

	// TODO: disabled state if no options
	return (
		<div className="gap-4 flex flex-col">
			<div>
				<Heading size="sm">{t(getKey('heading'))}</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					{t(getKey('description'))}
				</Text>
			</div>

			{allUsers?.length === 1 && (
				<Alert variant="info">
					<Info />
					<AlertTitle>{t(getKey('noUsersTitle'))}</AlertTitle>
					<AlertDescription>{t(getKey('noUsers'))}</AlertDescription>
				</Alert>
			)}

			<ComboBox
				disabled={allUsers?.length === 1}
				options={userOptions}
				value={grantedUserIds}
				isMultiSelect
				onChange={(userIds) => {
					setGrantedUserIds(userIds || [])
				}}
			/>
		</div>
	)
}

const LOCALE_KEY = 'librarySettingsScene.danger-zone/access-control.sections.libraryAccess'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
