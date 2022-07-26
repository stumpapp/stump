import toast from 'react-hot-toast';
import shallow from 'zustand/shallow';
import { me } from '~api/auth';
import { updateUserPreferences } from '~api/user';
import { useStore } from '~store/store';

import { UserPreferences } from '@stump/core';
import { useMutation, useQuery } from '@tanstack/react-query';

export function useUser() {
	const user = useStore((state) => state.user, shallow);

	const { setUser, setUserPreferences } = useStore((state) => ({
		setUser: state.setUser,
		setUserPreferences: state.setUserPreferences,
	}));

	const _ = useQuery(['getViewer'], me, {
		// Do not run query unless there is no user in the store
		enabled: !user,
		// I don't want errors thrown when user is not logged in (i.e. 401 status)
		suspense: false,
		onSuccess: (res) => {
			setUser(res.data);
		},
	});

	const { mutateAsync } = useMutation(
		['updateUserPreferences', user?.id],
		(preferences: UserPreferences) => updateUserPreferences(user!.id, preferences),
		{
			onSuccess(res) {
				setUserPreferences(res.data);
			},
		},
	);

	function updatePreferences(preferences: UserPreferences, showToast = false) {
		if (user?.id && preferences) {
			if (showToast) {
				toast.promise(mutateAsync(preferences), {
					loading: 'Updating...',
					success: 'Preferences updated!',
					error: 'Failed to update preferences.',
				});
			} else {
				mutateAsync(preferences).catch((err) => {
					console.error(err);
					toast.error('Failed to update preferences.');
				});
			}
		}
	}

	// TODO: handle on 401?

	return { user, preferences: user?.preferences, updatePreferences };
}
