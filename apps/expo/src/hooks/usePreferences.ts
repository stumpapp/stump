import { useUpdatePreferences } from '@stump/client'
import { UpdateUserPreferences, UserPreferences } from '@stump/sdk'
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
