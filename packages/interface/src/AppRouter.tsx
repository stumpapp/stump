import { useAppProps } from '@stump/client'
import React from 'react'
import { Navigate } from 'react-router'
import { Route, Routes } from 'react-router-dom'

import { AppLayout } from './AppLayout'

// @ts-expect-error: FIXME: idek man
const Home = React.lazy(() => import('./pages/Home'))
// @ts-expect-error: FIXME: idek man
const LibraryOverview = React.lazy(() => import('./pages/library/LibraryOverview'))
// @ts-expect-error: FIXME: idek man
const LibraryFileExplorer = React.lazy(() => import('./pages/library/LibraryFileExplorer'))
// @ts-expect-error: FIXME: idek man
const SeriesOverview = React.lazy(() => import('./pages/SeriesOverview'))
// @ts-expect-error: FIXME: idek man
const BookOverview = React.lazy(() => import('./pages/book/BookOverview'))
// @ts-expect-error: FIXME: idek man
const ReadBook = React.lazy(() => import('./pages/book/ReadBook'))
// @ts-expect-error: FIXME: idek man
const ReadEpub = React.lazy(() => import('./pages/book/ReadEpub'))
// @ts-expect-error: FIXME: idek man
const SettingsLayout = React.lazy(() => import('./components/settings/SettingsLayout'))
// @ts-expect-error: FIXME: idek man
const GeneralSettings = React.lazy(() => import('./pages/settings/GeneralSettings'))
// @ts-expect-error: FIXME: idek man
const JobSettings = React.lazy(() => import('./pages/settings/JobSettings'))
// @ts-expect-error: FIXME: idek man
const ServerSettings = React.lazy(() => import('./pages/settings/ServerSettings'))
// @ts-expect-error: FIXME: idek man
const UserSettings = React.lazy(() => import('./pages/settings/UserSettings'))
// @ts-expect-error: FIXME: idek man
const FourOhFour = React.lazy(() => import('./pages/FourOhFour'))
// @ts-expect-error: FIXME: idek man
const ServerConnectionError = React.lazy(() => import('./pages/ServerConnectionError'))
// @ts-expect-error: FIXME: idek man
const LoginOrClaim = React.lazy(() => import('./pages/LoginOrClaim'))
// @ts-expect-error: FIXME: idek man
const OnBoarding = React.lazy(() => import('./pages/OnBoarding'))

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
