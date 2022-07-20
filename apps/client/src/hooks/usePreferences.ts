import { useMutation, useQuery } from 'react-query';
import { getUserPreferences } from '~api/user';
import { useUser } from './useUser';

export function usePreferences() {
	const user = useUser();

	const { data: preferences } = useQuery(['getUserPreferences', user?.id], {
		queryFn: () => getUserPreferences(user!.id),
		enabled: !!user,
	});

	// const {} = useMutation('updateUserPreferences');

	// if (!user) {
	//   return {}
	// }
}
