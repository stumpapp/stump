import { LocaleProvider } from '@stump/i18n'
import { type AllowedLocale } from '@stump/i18n'
import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'

import { AppLayout } from './AppLayout.tsx'
import { RouterProvider } from './context/RouterContext.tsx'
import { BookRouter } from './scenes/book'
import { BookClubRouter } from './scenes/bookClub'
import { LibraryRouter } from './scenes/library'
import { SeriesRouter } from './scenes/series'
import { SettingsRouter } from './scenes/settings'
import { SmartListRouter } from './scenes/smartList'
import { useAppStore, useUserStore } from './stores'

const HomeScene = lazy(() => import('./scenes/home'))
const FourOhFour = lazy(() => import('./scenes/error/FourOhFour.tsx'))
const ServerConnectionErrorScene = lazy(
	() => import('./scenes/error/ServerConnectionErrorScene.tsx'),
)
const LoginOrClaimScene = lazy(() => import('./scenes/auth'))

type AppRouterProps = {
	basePath?: string
}

export function AppRouter({ basePath }: AppRouterProps = {}) {
	const locale = useUserStore((store) => store.userPreferences?.locale)

	const { baseUrl } = useAppStore((store) => ({
		baseUrl: store.baseUrl,
	}))

	if (!baseUrl) {
		throw new Error('Base URL is not set')

		// return (
		// 	<LocaleProvider locale={(locale as AllowedLocale) || 'en'}>
		// 		<RouterProvider basePath={basePath}>
		// 			<OnBoardingRouter />
		// 		</RouterProvider>
		// 	</LocaleProvider>
		// )
	}

	return (
		<LocaleProvider locale={(locale as AllowedLocale) || 'en'}>
			<RouterProvider basePath={basePath}>
				<Routes>
					<Route path="/" element={<AppLayout />}>
						<Route path="" element={<HomeScene />} />
						<Route path="libraries/*" element={<LibraryRouter />} />
						<Route path="series/*" element={<SeriesRouter />} />
						<Route path="books/*" element={<BookRouter />} />
						<Route path="book-clubs/*" element={<BookClubRouter />} />
						<Route path="/smart-lists/*" element={<SmartListRouter />} />
						<Route path="settings/*" element={<SettingsRouter />} />
					</Route>

					<Route path="/auth" element={<LoginOrClaimScene />} />
					<Route path="/server-connection-error" element={<ServerConnectionErrorScene />} />
					<Route path="*" element={<FourOhFour />} />
				</Routes>
			</RouterProvider>
		</LocaleProvider>
	)
}
