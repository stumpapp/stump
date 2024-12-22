import { Suspense, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { AllowedLocale, i18n } from './config'
import { LocaleContext } from './context'

type Props = {
	children: React.ReactNode
	locale?: AllowedLocale
}

export default function LocaleProvider({ locale = 'en', children }: Props) {
	const { t } = useTranslation(locale, { useSuspense: false })

	useEffect(() => {
		i18n.changeLanguage(locale)
	}, [locale])

	return (
		<Suspense>
			<LocaleContext.Provider
				value={{
					locale,
					t,
				}}
			>
				{children}
			</LocaleContext.Provider>
		</Suspense>
	)
}
