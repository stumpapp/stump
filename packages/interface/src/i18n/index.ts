import { AllowedLocale } from './config'

export { type LocaleContextProps, LocaleContext, useLocaleContext } from './context'
export { default as LocaleProvider } from './LocaleProvider'

export const localeNames: Record<AllowedLocale, string> = {
	en: 'English',
	es: 'Español',
	fr: 'Français',
	it: 'Italiano',
}

export function isLocale(value: string): value is AllowedLocale {
	return Object.keys(localeNames).includes(value)
}
