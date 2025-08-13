import { useGraphQLMutation } from '@stump/client'
import { graphql, UpdateUserPreferencesInput, UserPreferences } from '@stump/graphql'
import omit from 'lodash/omit'
import { useCallback } from 'react'

import { useUserStore } from '@/stores'

const mutation = graphql(`
	mutation UsePreferences($input: UpdateUserPreferencesInput!) {
		updateViewerPreferences(input: $input) {
			__typename
		}
	}
`)

export function usePreferences() {
	const { preferences, setPreferences } = useUserStore((state) => ({
		preferences: state.userPreferences,
		setPreferences: state.setUserPreferences,
	}))

	const { mutate } = useGraphQLMutation(mutation, {
		onSuccess: (_, { input }) => {
			setPreferences({
				...preferences,
				...input,
			} as UserPreferences)
		},
	})

	const update = useCallback(
		(input: Partial<UpdateUserPreferencesInput>) => {
			if (preferences) {
				return mutate({
					input: {
						...(omit(preferences, [
							'id',
							'navigationArrangement',
							'homeArrangement',
							'userId',
						]) as UpdateUserPreferencesInput),
						...input,
					},
				})
			} else {
				return Promise.reject(new Error('Preferences not loaded'))
			}
		},
		[mutate, preferences],
	)

	const store = useCallback(
		(input: Partial<UserPreferences>) => {
			if (preferences) {
				setPreferences({
					...preferences,
					...input,
				} as UserPreferences)
			} else {
				console.warn('Preferences not loaded, cannot store new preferences')
			}
		},
		[preferences, setPreferences],
	)

	return {
		preferences: (preferences || {}) as UserPreferences,
		update,
		store,
	}
}
