import { useQuery } from '@tanstack/react-query';

import { getStumpVersion } from '../api/server';
import { StumpQueryContext } from '../context';

export function useStumpVersion() {
	const { data: version } = useQuery(
		['stumpVersion'],
		() => getStumpVersion().then((res) => res.data),
		{
			context: StumpQueryContext,
			onError(err) {
				console.error('Failed to fetch Stump API version:', err);
			},
		},
	);

	return version;
}
