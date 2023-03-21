import { createContext, useContext } from 'react'

import { AllowedLocale } from './config'

export type LocaleContextProps = {
	locale: AllowedLocale
	t: (key: string) => string
}

export const LocaleContext = createContext<LocaleContextProps>({
	locale: 'en',
	t: (key: string) => key,
})
export const useLocaleContext = () => useContext(LocaleContext)
