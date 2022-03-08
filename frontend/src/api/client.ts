import { QueryClient } from 'react-query';

const client = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 0,
			suspense: true,
		},
	},
});

export default client;
