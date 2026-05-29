import React from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'

import App from './App'

function registerServiceWorkerWhenIdle() {
	if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

	const doRegister = () => registerSW()

	if (document.readyState === 'complete') {
		'requestIdleCallback' in globalThis
			? globalThis.requestIdleCallback(doRegister)
			: globalThis.setTimeout(doRegister, 0)
		return
	}

	globalThis.addEventListener(
		'load',
		() => {
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
