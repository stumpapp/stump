import { useUpdatePreferences } from '@stump/client'
import { UpdateUserPreferencesInput, UserPreferences } from '@stump/graphql'
import { useCallback } from 'react'

import { useUserStore } from '@/stores'

export function usePreferences() {
	const { preferences, setPreferences } = useUserStore((state) => ({
		preferences: state.userPreferences,
		setPreferences: state.setUserPreferences,
	}))

	const { update: mutate } = useUpdatePreferences({
		onSuccess: setPreferences,
	})

	const update = useCallback(
		(input: Partial<UpdateUserPreferencesInput>) => {
			if (preferences) {
				// @ts-expect-error: FIXME: fix this type error
				return mutate({
					...preferences,
					...input,
				})
			} else {
				return Promise.reject(new Error('Preferences not loaded'))
			}
		},
		[mutate, preferences],
	)

	return {
		preferences: (preferences || {}) as UserPreferences,
		update,
	}
}
