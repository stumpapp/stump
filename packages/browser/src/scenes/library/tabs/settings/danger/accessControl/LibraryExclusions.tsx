import { useLibraryExclusions, useUpdateLibraryExclusions, useUsersQuery } from '@stump/client'
import { Alert, ComboBox, Heading, Text, usePrevious } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useDebouncedValue } from 'rooks'

import { useAppContext } from '@/context'

import { useLibraryContext } from '../../../../context'

export default function LibraryExclusions() {
	const { library } = useLibraryContext()
	const { user } = useAppContext()
	const { t } = useLocaleContext()

	const { users: allUsers, isLoading: isLoadingUsers } = useUsersQuery()
	const { excludedUsers, isLoading: isLoadingExclusions } = useLibraryExclusions({
		id: library.id,
	})

	const { updateExcludedUsersAsync } = useUpdateLibraryExclusions({ id: library.id })
	const update = useCallback(
		async (ids: string[]) => {
			try {
				await updateExcludedUsersAsync(ids)
				toast.success(t(getKey('updated')))
			} catch (e) {
				console.error(e)
				toast.error(t(getKey('failure')))
			}
		},
		[updateExcludedUsersAsync, t],
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
				<Heading size="sm">{t(getKey('heading'))}</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					{t(getKey('description'))}
				</Text>
			</div>

			{allUsers?.length === 1 && (
				<Alert icon="info" level="info">
					<Alert.Content>{t(getKey('noUsers'))}</Alert.Content>
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
