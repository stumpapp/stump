import { Alert } from 'react-native'

export type AlertStatic = Pick<typeof Alert, 'alert' | 'prompt'>

// this is effectively just a re-export so that android can override the impl and
// finally rid itself of the ugly ass alerts

export const SystemAlert: AlertStatic = {
	alert: (...args: Parameters<typeof Alert.alert>) => Alert.alert(...args),
	prompt: (...args: Parameters<typeof Alert.prompt>) => Alert.prompt(...args),
}

export function SystemAlertHost() {
	return null
}
