import { createContext, useContext } from 'react'

export type IEmailerSettingsContext = {
	canCreateEmailer: boolean
	canEditEmailer: boolean
	canDeleteEmailer: boolean
}

export const EmailerSettingsContext = createContext<IEmailerSettingsContext>({
	canCreateEmailer: false,
	canDeleteEmailer: false,
	canEditEmailer: false,
})

export const useEmailerSettingsContext = () => useContext(EmailerSettingsContext)
