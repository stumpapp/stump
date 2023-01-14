import { useAppProps } from '@stump/client'
import React from 'react'
import { Navigate } from 'react-router'
import { Route, Routes } from 'react-router-dom'

import { AppLayout } from './AppLayout'

// FIXME: this is really annoying, and causes a different issue
type LazyComponent = Promise<{
	default: React.ComponentType<any>
}>

const Home = React.lazy(() => import('./pages/Home') as unknown as LazyComponent)
const LibraryOverview = React.lazy(
	() => import('./pages/library/LibraryOverview') as unknown as LazyComponent,
)
const LibraryFileExplorer = React.lazy(
	() => import('./pages/library/LibraryFileExplorer') as unknown as LazyComponent,
)
const SeriesOverview = React.lazy(
	() => import('./pages/SeriesOverview') as unknown as LazyComponent,
)
const BookOverview = React.lazy(
	() => import('./pages/book/BookOverview') as unknown as LazyComponent,
)
const ReadBook = React.lazy(() => import('./pages/book/ReadBook') as unknown as LazyComponent)
const ReadEpub = React.lazy(() => import('./pages/book/ReadEpub') as unknown as LazyComponent)
const SettingsLayout = React.lazy(
	() => import('./components/settings/SettingsLayout') as unknown as LazyComponent,
)
const GeneralSettings = React.lazy(
	() => import('./pages/settings/GeneralSettings') as unknown as LazyComponent,
)
const JobSettings = React.lazy(
	() => import('./pages/settings/JobSettings') as unknown as LazyComponent,
)
const ServerSettings = React.lazy(
	() => import('./pages/settings/ServerSettings') as unknown as LazyComponent,
)
const UserSettings = React.lazy(
	() => import('./pages/settings/UserSettings') as unknown as LazyComponent,
)
const FourOhFour = React.lazy(() => import('./pages/FourOhFour') as unknown as LazyComponent)
const ServerConnectionError = React.lazy(
	() => import('./pages/ServerConnectionError') as unknown as LazyComponent,
)
const LoginOrClaim = React.lazy(() => import('./pages/LoginOrClaim') as unknown as LazyComponent)
const OnBoarding = React.lazy(() => import('./pages/OnBoarding') as unknown as LazyComponent)

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
