import React from 'react';
import { Navigate } from 'react-router';
import { Route, Routes } from 'react-router-dom';

import { useAppProps } from '@stump/client';

import { AppLayout } from './AppLayout';

const Home = React.lazy(() => import('./pages/Home'));
const LibraryOverview = React.lazy(() => import('./pages/library/LibraryOverview'));
const LibraryFileExplorer = React.lazy(() => import('./pages/library/LibraryFileExplorer'));
const SeriesOverview = React.lazy(() => import('./pages/SeriesOverview'));
const BookOverview = React.lazy(() => import('./pages/book/BookOverview'));
const ReadBook = React.lazy(() => import('./pages/book/ReadBook'));
const ReadEpub = React.lazy(() => import('./pages/book/ReadEpub'));
const SettingsLayout = React.lazy(() => import('./components/settings/SettingsLayout'));
const GeneralSettings = React.lazy(() => import('./pages/settings/GeneralSettings'));
const JobSettings = React.lazy(() => import('./pages/settings/JobSettings'));
const ServerSettings = React.lazy(() => import('./pages/settings/ServerSettings'));
const UserSettings = React.lazy(() => import('./pages/settings/UserSettings'));
const FourOhFour = React.lazy(() => import('./pages/FourOhFour'));
const ServerConnectionError = React.lazy(() => import('./pages/ServerConnectionError'));
const LoginOrClaim = React.lazy(() => import('./pages/LoginOrClaim'));
const OnBoarding = React.lazy(() => import('./pages/OnBoarding'));

function OnBoardingRouter() {
	return (
		<React.Suspense>
			<Routes>
				<Route path="/" element={<OnBoarding />} />
			</Routes>
		</React.Suspense>
	);
}

export function AppRouter() {
	const appProps = useAppProps();

	if (!appProps?.baseUrl) {
		if (appProps?.platform === 'browser') {
			throw new Error('Base URL is not set');
		}

		return <OnBoardingRouter />;
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
					{appProps?.platform !== 'browser' && <Route path="general" element={<>Desktop!</>} />}
				</Route>
			</Route>

			<Route path="/auth" element={<LoginOrClaim />} />
			{appProps?.platform !== 'browser' && (
				<Route path="/server-connection-error" element={<ServerConnectionError />} />
			)}
			<Route path="*" element={<FourOhFour />} />
		</Routes>
	);
}
