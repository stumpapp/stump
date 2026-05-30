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
		let active = true
		async function prepare() {
			try {
				await loadLocaleResources(resolvedLocale)
				if (!active) {
					return
				}

				await Promise.all([i18n.changeLanguage(resolvedLocale), initDateFnsLocale(resolvedLocale)])
				document.documentElement.lang = resolvedLocale
			} catch (error) {
				console.error('Failed to load locale resources', error)
			}
		}
		prepare()
		return () => {
			active = false
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
