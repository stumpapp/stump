import { StumpWebClient } from '@stump/browser'

const getDebugUrl = () => {
	const { hostname } = window.location
	return `http://${hostname}:10801`
}

export const baseUrl = import.meta.env.PROD ? window.location.href : getDebugUrl()

export default function App() {
	return <StumpWebClient platform={'browser'} baseUrl={baseUrl} />
}
