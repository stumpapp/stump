import { StumpWebClient } from '@stump/browser'

// FIXME: This can't be fixed like this, it would have to be runtime dynamic
const DOMAIN_SUB_PATH = 'web'

const getDebugUrl = () => {
	const { hostname } = window.location
	return `http://${hostname}:10801`
}

// FIXME: skip appending if not set or set to / or sm
const getProductionUrl = () => {
	const { origin } = window.location
	return `${origin}/${DOMAIN_SUB_PATH}`
}

export const baseUrl = import.meta.env.PROD ? getProductionUrl() : getDebugUrl()

export default function App() {
	return <StumpWebClient platform={'browser'} baseUrl={baseUrl} />
}
