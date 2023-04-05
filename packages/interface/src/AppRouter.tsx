import { useAppProps } from '@stump/client'
import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { AppLayout } from './AppLayout'
import LocaleProvider from './i18n/LocaleProvider'
import BookRouter from './scenes/book/BookRouter'
import LibraryRouter from './scenes/library/LibraryRouter'
import OnBoardingRouter from './scenes/onboarding/OnBoardingRouter'
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
const FourOhFour = lazily(() => import('./scenes/error/FourOhFour'))
const ServerConnectionErrorScene = lazily(() => import('./scenes/error/ServerConnectionErrorScene'))
const LoginOrClaimScene = lazily(() => import('./scenes/auth/LoginOrClaimScene'))

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
					<Route path="book/*" element={<BookRouter />} />
					<Route path="settings/*" element={<SettingsRouter />} />
				</Route>

				<Route path="/auth" element={<LoginOrClaimScene />} />
				<Route path="/server-connection-error" element={<ServerConnectionErrorScene />} />
				<Route path="/404" element={<FourOhFour />} />
				<Route path="*" element={<Navigate to="/404" />} />
			</Routes>
		</LocaleProvider>
	)
}
