import { useQuery } from '@tanstack/react-query';
import shallow from 'zustand/shallow';
import { me } from '~api/auth';
import { useStore } from '~store/store';

export function useUser() {
	const user = useStore((state) => state.user, shallow);

	const { setUser } = useStore((state) => ({ setUser: state.setUserAndPreferences }));

	const _ = useQuery(['getViewer'], me, {
		// Do not run query unless there is no user in the store
		enabled: !user,
		// I don't want errors thrown when user is not logged in (i.e. 401 status)
		suspense: false,
		onSuccess: (res) => {
			setUser(res.data);
		},
	});

	// TODO: handle on 401?

	return user;
}

// import { User, UserPreferences } from '@stump/core';
// import { useMutation, useQuery } from '@tanstack/react-query';
// import { useState } from 'react';
// import toast from 'react-hot-toast';
// import { me } from '~api/auth';
// import client from '~api/client';
// import { updateUserPreferences } from '~api/user';

// export function useUser() {
// 	const [user, setUser] = useState<User | null>(null);

// 	const _ = useQuery(['getViewer'], me, {
// 		// Do not run query unless there is no user in the store
// 		// enabled: !user,
// 		// I don't want errors thrown when user is not logged in (i.e. 401 status)
// 		suspense: false,
// 		onSuccess: (res) => {
// 			// setUser(res.data);
// 			setUser(res.data);
// 		},
// 	});

// 	const { mutateAsync } = useMutation(
// 		['updateUserPreferences', user?.id],
// 		(preferences: UserPreferences) => updateUserPreferences(user!.id, preferences),
// 	);

// 	function updatePreferences(preferences: UserPreferences) {
// 		// console.log('UPDATING!!!!', { user, preferences });
// 		if (user?.id && preferences) {
// 			toast
// 				.promise(mutateAsync(preferences), {
// 					loading: 'Updating...',
// 					success: 'Preferences updated!',
// 					error: 'Failed to update preferences.',
// 				})
// 				.then(() => client.refetchQueries(['getViewer']));
// 		}
// 	}

// 	return { user, preferences: user?.preferences, updatePreferences };
// }
