import { LocaleProvider } from '@stump/i18n'
import { type AllowedLocale } from '@stump/i18n'
import React, { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'

import { AppLayout } from './AppLayout.tsx'
import BookRouter from './scenes/book/BookRouter.tsx'
import BookClubRouter from './scenes/book-club/BookClubRouter.tsx'
import LibraryRouter from './scenes/library/LibraryRouter.tsx'
import OnBoardingRouter from './scenes/onboarding/OnBoardingRouter.tsx'
import SeriesRouter from './scenes/series/SeriesRouter.tsx'
import SettingsRouter from './scenes/settings/SettingsRouter.tsx'
import { SmartListRouter } from './scenes/smart-list/index.ts'
import { useAppStore, useUserStore } from './stores'

const HomeScene = lazy(() => import('./scenes/home/HomeScene.tsx'))
const FourOhFour = lazy(() => import('./scenes/error/FourOhFour.tsx'))
const ServerConnectionErrorScene = lazy(
	() => import('./scenes/error/ServerConnectionErrorScene.tsx'),
)
const LoginOrClaimScene = lazy(() => import('./scenes/auth/LoginOrClaimScene.tsx'))

const IS_DEVELOPMENT = import.meta.env.MODE === 'development'

export function AppRouter() {
	const locale = useUserStore((store) => store.userPreferences?.locale)

	const { baseUrl, platform } = useAppStore((store) => ({
		baseUrl: store.baseUrl,
		platform: store.platform,
	}))

	if (!baseUrl) {
		if (platform === 'browser') {
			throw new Error('Base URL is not set')
		}

		return <OnBoardingRouter />
	}

	return (
		<LocaleProvider locale={locale as AllowedLocale}>
			<Routes>
				<Route path="/" element={<AppLayout />}>
					<Route path="" element={<HomeScene />} />
					<Route path="libraries/*" element={<LibraryRouter />} />
					<Route path="series/*" element={<SeriesRouter />} />
					<Route path="books/*" element={<BookRouter />} />
					{IS_DEVELOPMENT && <Route path="book-clubs/*" element={<BookClubRouter />} />}
					<Route path="/smart-lists/*" element={<SmartListRouter />} />
					<Route path="settings/*" element={<SettingsRouter />} />
				</Route>

				<Route path="/auth" element={<LoginOrClaimScene />} />
				<Route path="/server-connection-error" element={<ServerConnectionErrorScene />} />
				<Route path="*" element={<FourOhFour />} />
			</Routes>
		</LocaleProvider>
	)
}
