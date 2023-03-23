import { useAppProps } from '@stump/client'
import React from 'react'
import { Route, Routes } from 'react-router-dom'

import { AppLayout } from './AppLayout'
import LocaleProvider from './i18n/LocaleProvider'
import LibraryRouter from './scenes/library/LibraryRouter'
import SettingsRouter from './scenes/settings/SettingsRouter'

// FIXME: this is really annoying
export type LazyComponent = Promise<{
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	default: React.ComponentType<any>
}>

// I'm still so annoyed at this lol
export const lazily = (loader: () => unknown) => React.lazy(() => loader() as LazyComponent)

const HomeScene = lazily(() => import('./scenes/home/HomeScene'))
const SeriesOverviewScene = lazily(() => import('./scenes/series/SeriesOverviewScene'))
const BookOverview = lazily(() => import('./pages/book/BookOverview'))
const ReadBook = lazily(() => import('./pages/book/ReadBook'))
const ReadEpub = lazily(() => import('./pages/book/ReadEpub'))
const FourOhFour = lazily(() => import('./pages/FourOhFour'))
const ServerConnectionError = lazily(() => import('./pages/ServerConnectionError'))
const LoginOrClaimScene = lazily(() => import('./scenes/auth/LoginOrClaimScene'))
const OnBoarding = lazily(() => import('./pages/OnBoarding'))

function OnBoardingRouter() {
	return (
		<React.Suspense>
			<Routes>
				<Route path="/" element={<OnBoarding />} />
			</Routes>
		</React.Suspense>
	)
}

export function AppRouter() {
	const appProps = useAppProps()

	if (!appProps?.baseUrl) {
		if (appProps?.platform === 'browser') {
			throw new Error('Base URL is not set')
		}

		return <OnBoardingRouter />
	}

	return (
		<LocaleProvider>
			<Routes>
				<Route path="/" element={<AppLayout />}>
					<Route path="" element={<HomeScene />} />

					<Route path="library/*" element={<LibraryRouter />} />

					<Route path="series/:id" element={<SeriesOverviewScene />} />

					<Route path="books/:id" element={<BookOverview />} />
					<Route path="books/:id/pages/:page" element={<ReadBook />} />
					<Route path="epub/:id" element={<ReadEpub />} />

					<Route path="settings/*" element={<SettingsRouter />} />
				</Route>

				<Route path="/auth" element={<LoginOrClaimScene />} />
				<Route path="/server-connection-error" element={<ServerConnectionError />} />
				<Route path="*" element={<FourOhFour />} />
			</Routes>
		</LocaleProvider>
	)
}
