import { UpdateUserPreferences, UserPreferences } from '@stump/types'
import { useCallback } from 'react'

import { useUpdatePreferences } from '../queries/user'
import { useUserStore } from '../stores/useUserStore'

export function usePreferences() {
	const { preferences, setPreferences } = useUserStore((state) => ({
		preferences: state.userPreferences,
		setPreferences: state.setUserPreferences,
	}))

	const { update: mutate } = useUpdatePreferences({
		onSuccess: setPreferences,
	})

	const update = useCallback(
		(input: Partial<UpdateUserPreferences>) => {
			if (preferences) {
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
