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
	query LibraryExclusionsUsersQuery {
		users(pagination: { none: { unpaginated: true } }) {
			nodes {
				id
				username
			}
		}
	}
`)

const excludedUsersQuery = graphql(`
	query LibraryExclusionsQuery($id: ID!) {
		libraryById(id: $id) {
			excludedUsers {
				id
				username
			}
		}
	}
`)

const mutation = graphql(`
	mutation UpdateLibraryExclusions($id: ID!, $userIds: [String!]!) {
		updateLibraryExcludedUsers(id: $id, userIds: $userIds) {
			id
			excludedUsers {
				id
				username
			}
		}
	}
`)

export default function LibraryExclusions() {
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
			document: excludedUsersQuery,
			queryKey: ['libraryExclusions', library.id],
			variables: { id: library.id },
		},
	])
	const excludedUsers = useMemo(() => libraryById?.excludedUsers || [], [libraryById])

	const client = useQueryClient()

	const { mutate } = useGraphQLMutation(mutation, {
		onSuccess: ({ updateLibraryExcludedUsers: { excludedUsers } }) => {
			// Update without refetching to reduce network
			client.setQueryData(['libraryExclusions', library.id], {
				libraryById: {
					...libraryById,
					excludedUsers,
				},
			})
		},
	})

	const updateExclusions = useCallback(
		(ids: string[]) => {
			mutate({ id: library.id, userIds: ids })
		},
		[mutate, library],
	)

	const [excludedUserIds, setExcludedUserIds] = useState<string[] | undefined>(() =>
		excludedUsers?.map((user) => user.id),
	)
	const [debouncedUserIds] = useDebouncedValue(excludedUserIds, 500)

	useEffect(() => {
		setExcludedUserIds(excludedUsers?.map((user) => user.id) || [])
	}, [excludedUsers])

	const previousLibrary = usePrevious(library)
	const isSameLibrary = previousLibrary?.id === library.id
	const variablesLoaded = !!debouncedUserIds && !!excludedUsers
	const shouldCall =
		variablesLoaded && debouncedUserIds.length !== excludedUsers.length && isSameLibrary

	useEffect(() => {
		if (shouldCall) {
			updateExclusions(debouncedUserIds)
		}
	}, [debouncedUserIds, updateExclusions, shouldCall])

	const userOptions = useMemo(
		() =>
			(allUsers?.map((user) => ({ label: user.username, value: user.id })) || []).filter(
				(option) => option.value !== user.id,
			),
		[allUsers, user],
	)

	// TODO: disabled state if no options
	return (
		<div className="flex flex-col gap-4">
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
				value={excludedUserIds}
				isMultiSelect
				onChange={(userIds) => {
					setExcludedUserIds(userIds || [])
				}}
			/>
		</div>
	)
}

const LOCALE_KEY = 'librarySettingsScene.danger-zone/access-control.sections.libraryExclusions'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
