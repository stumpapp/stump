import { useLocaleContext } from './context'
import { AllowedLocale } from './locales'

type Params = {
	namespace: 'mobileApp' | 'webApp'
	displayLanguageKeys?: 'none' | 'abbreviated' | 'full'
	textCase?: 'lowerCase' | 'sentenceCase' | 'titleCase'
}

type Return = {
	/**
	 * The current locale set in parent context
	 */
	locale: AllowedLocale
	/**
	 * The primary namespace which was configured
	 */
	namespace: 'mobileApp' | 'webApp'
	/**
	 * the shorthand translation function which assumes the primary
	 * namespace
	 */
	t: (key: string, options?: Record<string, unknown>) => string
	/**
	 * the translation function which takes a full key from the locale root,
	 * e.g. 'shared.common.cancel'
	 */
	translate: (fullKey: string, options?: Record<string, unknown>) => string
}

export function useCreateTranslate({
	namespace,
	displayLanguageKeys = 'none',
	textCase = 'titleCase',
}: Params): Return {
	const { t, locale } = useLocaleContext()

	let translate = (key: string, options?: Record<string, unknown>, ns?: string | null) => {
		// ns = null means key is from the locale root
		const fullKey = ns === null ? key : `${ns || namespace}.${key}`
		const translation = t(fullKey, {
			...(locale.startsWith('en-') && textCase === 'sentenceCase' ? { ns: 'sentenceCase' } : {}),
			...options,
		})
		if (textCase === 'lowerCase') {
			return translation.toLocaleLowerCase(locale)
		}
		return translation
	}

	if (displayLanguageKeys === 'full') {
		translate = (key: string) => key
	}

	if (displayLanguageKeys === 'abbreviated') {
		translate = (key: string) => {
			const parts = key.split('.')

			const abbreviatedKey = parts.map((part, index) => {
				if (index === parts.length - 1) {
					return part
				}
				return part.charAt(0)
			})

			return abbreviatedKey.join('.')
		}
	}

	return {
		// technically with this shape you could just use t and pass ns in the 3rd arg but
		// that is a smell so i am obscuring the type to force it to be used as intended
		t: translate,
		locale,
		namespace,
		translate: (fullKey, options) => translate(fullKey, options, null),
		// ^ i break the rule here but that's fine lol only place it should be done as such
	}
}
