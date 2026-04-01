import 'intl-pluralrules'
import 'expo-asset'

import { Buffer } from 'buffer'
import { registerRootComponent } from 'expo'
import { ExpoRoot } from 'expo-router'

global.Buffer = Buffer

import * as Sentry from '@sentry/react-native'

export const reactNavigationIntegration = Sentry.reactNavigationIntegration({
	enableTimeToInitialDisplay: true,
})

Sentry.init({
	dsn: 'https://d132cdb089404ea6886e3747284f4fdb@app.glitchtip.com/12750',
	// Sensitive data should never be sent to Glitchtip
	sendDefaultPii: false,
	integrations: [reactNavigationIntegration],
	enableAppHangTracking: true,
	appHangTimeoutInterval: 10_000, // 10 seconds
	enabled: process.env.NODE_ENV !== 'development',
	beforeSend(event) {
		const message = event.exception?.values?.[0]?.value ?? ''
		// TODO: Investigate why this flakey error is getting reported, it is overloading
		// my monthly quota for glitchtip
		if (/no sheet found with tag/i.test(message)) {
			return null
		}
		return event
	},
})

// https://docs.expo.dev/router/reference/troubleshooting/#expo_router_app_root-not-defined

// Must be exported or Fast Refresh won't update the context
export function App() {
	const ctx = require.context('./app')
	return <ExpoRoot context={ctx} />
}

const WithSentry = Sentry.wrap(App)

registerRootComponent(WithSentry)

// TODO: https://glitchtip.com/
