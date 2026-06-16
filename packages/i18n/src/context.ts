import { createContext, useContext } from 'react'

import { AllowedLocale, resolveLocale } from './config'

export type LocaleContextProps = {
	locale: AllowedLocale
	t: (key: string, options?: Record<string, unknown>) => string
}

export const getDefaultLocale = (defaultValue: AllowedLocale = 'en-US') => {
	if (!('navigator' in globalThis)) {
		return defaultValue
	}

	return resolveLocale(navigator?.language)
}

export const LocaleContext = createContext<LocaleContextProps>({
	locale: getDefaultLocale(),
	t: (key: string) => key,
})
export const useLocaleContext = () => useContext(LocaleContext)
