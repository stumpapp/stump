import { useAppProps } from '@stump/client'
import React from 'react'
import { Navigate } from 'react-router'
import { Route, Routes } from 'react-router-dom'

import { AppLayout } from './AppLayout'

// FIXME: this is really annoying
type LazyComponent = Promise<{
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	default: React.ComponentType<any>
}>

// I'm still so annoyed at this lol
const lazily = (loader: () => unknown) => React.lazy(() => loader() as LazyComponent)
const Home = lazily(() => import('./pages/Home.js'))
const LibraryOverview = lazily(() => import('./pages/library/LibraryOverview.js'))
const LibraryFileExplorer = lazily(() => import('./pages/library/LibraryFileExplorer.js'))
const CreateLibrary = lazily(() => import('./pages/library/CreateLibrary.js'))
const SeriesOverview = lazily(() => import('./pages/SeriesOverview.js'))
const BookOverview = lazily(() => import('./pages/book/BookOverview.js'))
const ReadBook = lazily(() => import('./pages/book/ReadBook.js'))
const ReadEpub = lazily(() => import('./pages/book/ReadEpub.js'))
const SettingsLayout = lazily(() => import('./components/settings/SettingsLayout.js'))
const GeneralSettings = lazily(() => import('./pages/settings/GeneralSettings.js'))
const JobSettings = lazily(() => import('./pages/settings/JobSettings.js'))
const ServerSettings = lazily(() => import('./pages/settings/ServerSettings.js'))
const UserSettings = lazily(() => import('./pages/settings/UserSettings.js'))
const FourOhFour = lazily(() => import('./pages/FourOhFour.js'))
const ServerConnectionError = lazily(() => import('./pages/ServerConnectionError.js'))
const LoginOrClaim = lazily(() => import('./pages/LoginOrClaim.js'))
const OnBoarding = lazily(() => import('./pages/OnBoarding.js'))

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
		<Routes>
			<Route path="/" element={<AppLayout />}>
				<Route path="" element={<Home />} />

				<Route path="libraries/create" element={<CreateLibrary />} />
				<Route path="libraries/:id" element={<LibraryOverview />} />
				<Route path="libraries/:id/explorer" element={<LibraryFileExplorer />} />

				<Route path="series/:id" element={<SeriesOverview />} />

				<Route path="books/:id" element={<BookOverview />} />
				<Route path="books/:id/pages/:page" element={<ReadBook />} />
				<Route path="epub/:id" element={<ReadEpub />} />

				<Route path="settings" element={<SettingsLayout />}>
					<Route path="" element={<Navigate to="/settings/general" replace />} />
					<Route path="general" element={<GeneralSettings />} />
					<Route path="users" element={<UserSettings />} />
					<Route path="server" element={<ServerSettings />} />
					<Route path="jobs" element={<JobSettings />} />
					{appProps?.platform !== 'browser' && <Route path="desktop" element={<>Desktop!</>} />}
				</Route>
			</Route>

			<Route path="/auth" element={<LoginOrClaim />} />
			{appProps?.platform !== 'browser' && (
				<Route path="/server-connection-error" element={<ServerConnectionError />} />
			)}
			<Route path="*" element={<FourOhFour />} />
		</Routes>
	)
}
