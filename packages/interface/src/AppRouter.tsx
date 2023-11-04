import { useAppProps } from '@stump/client'
import React from 'react'
import { Route, Routes } from 'react-router-dom'

import { AppLayout } from './AppLayout'
import LocaleProvider from './i18n/LocaleProvider'
import BookRouter from './scenes/book/BookRouter'
import BookClubRouter from './scenes/book-club/BookClubRouter'
import LibraryRouter from './scenes/library/LibraryRouter'
import OnBoardingRouter from './scenes/onboarding/OnBoardingRouter'
import SeriesRouter from './scenes/series/SeriesRouter'
import SettingsRouter from './scenes/settings/SettingsRouter'

// FIXME: this is really annoying
export type LazyComponent = Promise<{
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	default: React.ComponentType<any>
}>

// I'm still so annoyed at this lol
export const lazily = (loader: () => unknown) => React.lazy(() => loader() as LazyComponent)

const HomeScene = lazily(() => import('./scenes/home/HomeScene.tsx'))
const FourOhFour = lazily(() => import('./scenes/error/FourOhFour.tsx'))
const ServerConnectionErrorScene = lazily(
	() => import('./scenes/error/ServerConnectionErrorScene.tsx'),
)
const LoginOrClaimScene = lazily(() => import('./scenes/auth/LoginOrClaimScene.tsx'))

const IS_DEVELOPMENT = import.meta.env.MODE === 'development'

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
					<Route path="libraries/*" element={<LibraryRouter />} />
					<Route path="series/*" element={<SeriesRouter />} />
					<Route path="books/*" element={<BookRouter />} />
					{IS_DEVELOPMENT && <Route path="book-clubs/*" element={<BookClubRouter />} />}
					<Route path="settings/*" element={<SettingsRouter />} />
				</Route>

				<Route path="/auth" element={<LoginOrClaimScene />} />
				<Route path="/server-connection-error" element={<ServerConnectionErrorScene />} />
				<Route path="*" element={<FourOhFour />} />
			</Routes>
		</LocaleProvider>
	)
}
