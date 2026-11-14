import React from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'

function registerServiceWorkerWhenIdle() {
	if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

	if (navigator.serviceWorker.controller) {
		navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), {
			once: true,
		})
	}

	const doRegister = () => {
		const scope = new URL('./', document.baseURI)
		navigator.serviceWorker
			.register(new URL('sw.js', scope), { scope: scope.pathname })
			.catch((error) => {
				console.error('Failed to register service worker', error)
			})
	}

	if (document.readyState === 'complete') {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		'requestIdleCallback' in globalThis
			? globalThis.requestIdleCallback(doRegister)
			: globalThis.setTimeout(doRegister, 0)
		return
	}

	globalThis.addEventListener(
		'load',
		() => {
			// eslint-disable-next-line @typescript-eslint/no-unused-expressions
			'requestIdleCallback' in globalThis
				? globalThis.requestIdleCallback(doRegister)
				: globalThis.setTimeout(doRegister, 0)
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
