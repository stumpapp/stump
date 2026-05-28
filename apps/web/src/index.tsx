import React from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'

function registerServiceWorkerWhenIdle() {
	const isBrowser = 'document' in globalThis && 'navigator' in globalThis

	if (!import.meta.env.PROD || !isBrowser || !('serviceWorker' in globalThis.navigator)) {
		return
	}

	const serviceWorkerUrl = '/sw.js'
	const serviceWorkerScope = '/'

	const register = async () => {
		let scriptExists = true

		try {
			const response = await fetch(serviceWorkerUrl, { cache: 'no-store', method: 'HEAD' })

			// Some hosts reject HEAD for static assets, so only treat non-405 failures as missing.
			scriptExists = response.ok || response.status === 405

			if (!scriptExists) {
				console.warn('Skipping service worker registration: script unavailable', {
					serviceWorkerScope,
					serviceWorkerUrl,
					status: response.status,
				})
				return
			}
		} catch (error) {
			console.warn('Skipping service worker registration: script check failed', {
				error,
				serviceWorkerScope,
				serviceWorkerUrl,
			})
			return
		}

		globalThis.navigator.serviceWorker
			.register(serviceWorkerUrl, { scope: serviceWorkerScope })
			.catch((error) => {
				console.error('Service worker registration failed', {
					error,
					serviceWorkerScope,
					serviceWorkerUrl,
				})
			})
	}

	if (globalThis.document.readyState === 'complete') {
		if ('requestIdleCallback' in globalThis) {
			globalThis.requestIdleCallback(register)
		} else {
			globalThis.setTimeout(register, 0)
		}
		return
	}

	globalThis.addEventListener(
		'load',
		() => {
			if ('requestIdleCallback' in globalThis) {
				globalThis.requestIdleCallback(register)
			} else {
				globalThis.setTimeout(register, 0)
			}
		},
		{ once: true },
	)
}

const rootElement = document.getElementById('root')

if (!rootElement) {
	throw new Error('Root element not found')
}

const root = createRoot(rootElement)
root.render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
)

registerServiceWorkerWhenIdle()
