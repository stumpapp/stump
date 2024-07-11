import { createContext, useContext } from 'react'

export type IEmailerSettingsContext = {
	canCreateEmailer: boolean
	canEditEmailer: boolean
}

export const EmailerSettingsContext = createContext<IEmailerSettingsContext>({
	canCreateEmailer: false,
	canEditEmailer: false,
})

export const useEmailerSettingsContext = () => useContext(EmailerSettingsContext)
