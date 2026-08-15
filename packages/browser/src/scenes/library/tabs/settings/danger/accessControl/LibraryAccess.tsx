import { useGraphQLMutation, useSuspenseGraphQLQueries } from '@stump/client'
import { Button, ComboBox, ConfirmationModal, Heading, Text, usePrevious } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { useAppContext } from '@/context'
import { usePaths } from '@/paths'

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
	const navigate = useNavigate()
	const paths = usePaths()

	const { mutate } = useGraphQLMutation(mutation, {
		onSuccess: async ({ updateLibraryAccess: { allowedUsers } }) => {
			const didRevokeSelfAccess = !allowedUsers.some((u) => u.id === user.id)
			if (didRevokeSelfAccess) {
				await client.cancelQueries()
				client.clear()
				navigate(paths.home())
			} else {
				// update without refetching to reduce network
				client.setQueryData(['libraryAccess', library.id], {
					libraryById: {
						...libraryById,
						allowedUsers,
					},
				})
			}
		},
	})

	const [grantedUserIds, setGrantedUserIds] = useState<string[] | undefined>(() =>
		allowedUsers?.map((user) => user.id),
	)
	const [showConfirmationModal, setShowConfirmationModal] = useState(false)

	useEffect(() => {
		setGrantedUserIds(allowedUsers?.map((user) => user.id) || [])
	}, [allowedUsers])

	const updateGrants = () => {
		if (!grantedUserIds) return
		mutate({ id: library.id, userIds: grantedUserIds })
	}

	const onSaveChanges = () => {
		if (!grantedUserIds) return
		const isRevokingOwnAccess = !grantedUserIds.includes(user.id)

		if (isRevokingOwnAccess) {
			setShowConfirmationModal(true)
		} else {
			updateGrants()
		}
	}

	const previousLibrary = usePrevious(library)
	const isSameLibrary = previousLibrary?.id === library.id
	const isDifferentUsers = !(
		grantedUserIds?.length === allowedUsers?.length &&
		grantedUserIds?.every((id) => allowedUsers?.some((user) => user.id === id))
	)

	const userOptions = allUsers?.map((user) => ({ label: user.username, value: user.id })) || []

	return (
		<div className="gap-4 flex flex-col">
			<div>
				<Heading size="sm">{t(getKey('heading'))}</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					{t(getKey('description'))}
				</Text>
			</div>

			<ComboBox
				options={userOptions}
				value={grantedUserIds}
				isMultiSelect
				onChange={(userIds) => {
					setGrantedUserIds(userIds || [])
				}}
			/>

			<div>
				<Button disabled={!isDifferentUsers || !isSameLibrary} onClick={onSaveChanges}>
					{t('common.saveChanges')}
				</Button>
			</div>

			<ConfirmationModal
				title={t(getKey('selfAccessRevokeConfirmation.title'))}
				description={t(getKey('selfAccessRevokeConfirmation.description'))}
				isOpen={showConfirmationModal}
				onClose={() => setShowConfirmationModal(false)}
				onConfirm={updateGrants}
			/>
		</div>
	)
}

const LOCALE_KEY = 'librarySettingsScene.danger-zone/access-control.sections.libraryAccess'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
