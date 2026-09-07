import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { AllowedLocale, i18n, loadLocaleResources, resolveLocale } from './config'
import { getDefaultLocale, LocaleContext } from './context'
import { initDateFnsLocale } from './dateFnsLocale'

type Props = Readonly<{
	children: React.ReactNode
	locale?: AllowedLocale
}>

export default function LocaleProvider({ locale = getDefaultLocale(), children }: Props) {
	const resolvedLocale = resolveLocale(locale)
	const { t } = useTranslation(resolvedLocale, { useSuspense: false })

	useEffect(() => {
		const controller = new AbortController()
		const { signal } = controller

		async function prepare() {
			try {
				await loadLocaleResources(resolvedLocale, signal)
				if (signal.aborted) {
					return
				}

				await Promise.all([
					i18n.changeLanguage(resolvedLocale),
					initDateFnsLocale(resolvedLocale, signal),
				])
				if (signal.aborted) {
					return
				}

				// locale provider is used in web and expo, the latter
				// not having a document
				if ('document' in globalThis) {
					document.documentElement.lang = resolvedLocale
				}
			} catch (error) {
				if (!signal.aborted) {
					console.error('Failed to load locale resources', error)
				}
			}
		}
		prepare()
		return () => {
			controller.abort()
		}
	}, [resolvedLocale])

	const contextValue = useMemo(
		() => ({
			locale: resolvedLocale,
			t,
		}),
		[resolvedLocale, t],
	)

	return <LocaleContext.Provider value={contextValue}>{children}</LocaleContext.Provider>
}
