import StumpInterface from '@stump/interface';

import '@stump/interface/styles';

export const baseUrl = import.meta.env.PROD
	? `${import.meta.env.BASE_URL}`
	: 'http://localhost:10801';

export default function App() {
	return <StumpInterface platform={'browser'} baseUrl={baseUrl} />;
}
