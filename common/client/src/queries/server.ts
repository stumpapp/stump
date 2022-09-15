import { useQuery } from '@tanstack/react-query';
import { getStumpVersion } from '../api/server';

export function useStumpVersion() {
	const { data: version } = useQuery(
		['stumpVersion'],
		() => getStumpVersion().then((res) => res.data),
		{
			onError(err) {
				console.error('Failed to fetch Stump API version:', err);
			},
		},
	);

	return version;
}
