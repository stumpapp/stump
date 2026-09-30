import { Alert, AlertStatic } from 'react-native'

// this is effectively just a re-export so that android can override the impl and
// finally rid itself of the ugly ass alerts

export const SystemAlert: AlertStatic = {
	alert: (...args) => Alert.alert(...args),
	prompt: (...args) => Alert.prompt(...args),
}

export function SystemAlertHost() {
	return null
}
