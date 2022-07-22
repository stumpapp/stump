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
