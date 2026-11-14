import { useGraphQLMutation, useSuspenseGraphQLQueries } from '@stump/client'
import { Alert, AlertDescription, AlertTitle, ComboBox } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDebouncedValue } from 'rooks'

import { SettingsSection } from '@/components/sharedLayout'
import { useAppContext } from '@/context'
import { useTranslate } from '@/hooks/useTranslate'

const usersQuery = graphql(`
	query SeriesSharingUsersQuery {
		users(pagination: { none: { unpaginated: true } }) {
			nodes {
				id
				username
			}
		}
	}
`)

const sharedUsersQuery = graphql(`
	query SeriesSharingQuery($id: ID!) {
		seriesById(id: $id) {
			id
			sharedUsers {
				id
				username
			}
		}
	}
`)

const mutation = graphql(`
	mutation UpdateSeriesSharedUsers($id: ID!, $userIds: [String!]!) {
		updateSeriesSharedUsers(id: $id, userIds: $userIds) {
			id
			sharedUsers {
				id
				username
			}
		}
	}
`)

type Props = {
	seriesId: string
}

export default function SeriesSharing({ seriesId }: Props) {
	const { user } = useAppContext()
	const { t } = useTranslate()

	const [
		{
			data: {
				users: { nodes: allUsers },
			},
		},
		{
			data: { seriesById },
		},
	] = useSuspenseGraphQLQueries([
		{
			document: usersQuery,
			queryKey: ['users'],
		},
		{
			document: sharedUsersQuery,
			queryKey: ['seriesSharedUsers', seriesId],
			// @ts-expect-error: Need to fix this type error with useSuspenseGraphQLQueries
			variables: { id: seriesId },
		},
	])
	const sharedUsers = useMemo(() => seriesById?.sharedUsers || [], [seriesById])

	const client = useQueryClient()

	const { mutate } = useGraphQLMutation(mutation, {
		onSuccess: ({ updateSeriesSharedUsers: { sharedUsers } }) => {
			// Update without refetching to reduce network
			client.setQueryData(['seriesSharedUsers', seriesId], {
				seriesById: {
					...seriesById,
					sharedUsers,
				},
			})
		},
	})

	const [sharedUserIds, setSharedUserIds] = useState<string[]>(() =>
		sharedUsers.map((user) => user.id),
	)
	const [debouncedUserIds] = useDebouncedValue(sharedUserIds, 500)

	useEffect(() => {
		setSharedUserIds(sharedUsers.map((user) => user.id))
	}, [sharedUsers])

	const hasChanges = useMemo(() => {
		if (!debouncedUserIds) return false
		const current = new Set(sharedUsers.map((user) => user.id))
		return (
			debouncedUserIds.length !== current.size || debouncedUserIds.some((id) => !current.has(id))
		)
	}, [debouncedUserIds, sharedUsers])

	const updateShares = useCallback(
		(ids: string[]) => mutate({ id: seriesId, userIds: ids }),
		[mutate, seriesId],
	)

	useEffect(() => {
		if (hasChanges && debouncedUserIds) {
			updateShares(debouncedUserIds)
		}
	}, [debouncedUserIds, hasChanges, updateShares])

	const userOptions = useMemo(
		() =>
			(allUsers?.map((user) => ({ label: user.username, value: user.id })) || []).filter(
				(option) => option.value !== user.id,
			),
		[allUsers, user],
	)

	return (
		<SettingsSection title={t(getKey('heading'))} description={t(getKey('description'))}>
			{!userOptions.length && (
				<Alert variant="info">
					<Info />
					<AlertTitle>{t(getKey('noUsersTitle'))}</AlertTitle>
					<AlertDescription>{t(getKey('noUsers'))}</AlertDescription>
				</Alert>
			)}

			<ComboBox
				disabled={!userOptions.length}
				options={userOptions}
				value={sharedUserIds}
				isMultiSelect
				onChange={(userIds) => {
					setSharedUserIds(userIds || [])
				}}
			/>
		</SettingsSection>
	)
}

const LOCALE_KEY = 'seriesSettingsScene.sections.sharing'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
