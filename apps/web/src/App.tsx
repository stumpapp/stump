import { StumpWebClient } from '@stump/browser'
import { BrowserRouter } from 'react-router-dom'

function getLocation() {
	if (typeof globalThis === 'undefined' || !('location' in globalThis)) {
		return null
	}

	return globalThis.location
}

const getDebugUrl = () => {
	const hostname = getLocation()?.hostname || 'localhost'
	return `http://${hostname}:10801`
}

export const baseUrl = import.meta.env.PROD ? (getLocation()?.origin ?? '') : getDebugUrl()

export default function App() {
	return (
		<BrowserRouter>
			<StumpWebClient platform={'browser'} baseUrl={baseUrl} />
		</BrowserRouter>
	)
}
