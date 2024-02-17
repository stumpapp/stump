import { useLibraryExclusionsQuery, useUsersQuery } from '@stump/client'
import { ComboBox, Heading, Text } from '@stump/components'
import React, { useEffect, useMemo, useState } from 'react'

import { useAppContext } from '@/context'

import { useLibraryContext } from '../context'

export default function LibraryExclusions() {
	const { library } = useLibraryContext()
	const { user } = useAppContext()

	const { users: allUsers, isLoading: isLoadingUsers } = useUsersQuery()
	const { excludedUsers, isLoading: isLoadingExclusions } = useLibraryExclusionsQuery({
		id: library.id,
	})

	const [excludedUserIds, setExcludedUserIds] = useState<string[]>(
		() => excludedUsers?.map((user) => user.id) || [],
	)
	useEffect(() => {
		setExcludedUserIds(excludedUsers?.map((user) => user.id) || [])
	}, [excludedUsers])

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

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Heading size="sm">Excluded users</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					These users will be excluded from accessing the library or any of its contents. Changes
					will take effect immediately
				</Text>
			</div>

			<ComboBox options={userOptions} value={excludedUserIds} isMultiSelect />
		</div>
	)
}
