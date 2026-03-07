import { createContext, useContext } from 'react'

import { AllowedLocale } from './config'

export type LocaleContextProps = {
	locale: AllowedLocale
	t: (key: string) => string
}

export const getDefaultLocale = () => {
	return 'navigator' in globalThis ? (navigator?.language as AllowedLocale) : 'en-US'
}

export const LocaleContext = createContext<LocaleContextProps>({
	locale: getDefaultLocale(),
	t: (key: string) => key,
})
export const useLocaleContext = () => useContext(LocaleContext)
