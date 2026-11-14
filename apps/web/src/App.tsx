import { StumpWebClient } from '@stump/browser'
import { BrowserRouter } from 'react-router'

const getDebugUrl = () => {
	const { hostname } = window.location
	return `http://${hostname}:10801`
}

// The server injects a base element so this also works when opening a nested route directly.
const basePath = import.meta.env.PROD ? new URL(document.baseURI).pathname.replace(/\/$/, '') : ''
export const baseUrl = import.meta.env.PROD
	? `${window.location.origin}${basePath}/api`
	: getDebugUrl()

export default function App() {
	return (
		<BrowserRouter basename={basePath || '/'}>
			<StumpWebClient platform={'browser'} baseUrl={baseUrl} />
		</BrowserRouter>
	)
}
