import { createContext, useContext } from 'react'

import { ALERT_ICONS } from './Alert'

export type AlertContextProps = {
	level: keyof typeof ALERT_ICONS
}

export const AlertContext = createContext<AlertContextProps>({
	level: 'info',
})
export const useAlertContext = () => useContext(AlertContext)
