import {
	useLibraryExclusionsMutation,
	useLibraryExclusionsQuery,
	useUsersQuery,
} from '@stump/client'
import { ComboBox, Heading, Text, usePrevious } from '@stump/components'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useDebouncedValue } from 'rooks'

import { useAppContext } from '@/context'

import { useLibraryContext } from '../../context'

// TODO: remove auto-submit! Annoying between libraries

export default function LibraryExclusions() {
	const { library } = useLibraryContext()
	const { user } = useAppContext()

	const { users: allUsers, isLoading: isLoadingUsers } = useUsersQuery()
	const { excludedUsers, isLoading: isLoadingExclusions } = useLibraryExclusionsQuery({
		id: library.id,
	})

	const { updateExcludedUsersAsync } = useLibraryExclusionsMutation({ id: library.id })
	const update = useCallback(
		async (ids: string[]) => {
			try {
				await updateExcludedUsersAsync(ids)
				toast.success('Excluded users updated')
			} catch (e) {
				console.error(e)
				toast.error('Failed to update excluded users')
			}
		},
		[updateExcludedUsersAsync],
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
			update(debouncedUserIds)
		}
	}, [debouncedUserIds, update, shouldCall])

	const userOptions = useMemo(
		() =>
			(allUsers?.map((user) => ({ label: user.username, value: user.id })) || []).filter(
				(option) => option.value !== user.id,
			),
		[allUsers, user],
	)

	if (isLoadingUsers || isLoadingExclusions) {
		return null
	}

	// TODO: disabled state if no options
	return (
		<div className="flex flex-col gap-4">
			<div>
				<Heading size="sm">Excluded users</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					These users will be excluded from accessing the library or any of its contents. Changes
					will take effect immediately
				</Text>
			</div>

			<ComboBox
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
