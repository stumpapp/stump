import React, { useContext } from 'react';
import { Route, Routes } from 'react-router-dom';

import { AppPropsContext } from '@stump/client';
import { AppLayout } from './AppLayout';

// TODO: import() for lazy loading...
import Home from './pages/Home';
import OnBoarding from './pages/OnBoarding';
import LoginOrClaim from './pages/LoginOrClaim';

function OnBoardingRouter() {
	return (
		<Routes>
			<Route path="/" element={<OnBoarding />} />
		</Routes>
	);
}

export function AppRouter() {
	const appProps = useContext(AppPropsContext);

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
			</Route>

			<Route path="/auth" element={<LoginOrClaim />} />

			{/* <Route path="" element={<Home />} />
		<Route path="settings" element={<Settings />}>
			<Route path="" element={<Navigate to="/settings/general" replace={true} />} />
			<Route path="general" element={<GeneralSettings />} />
			<Route path="users" element={<UserSettings />} />
			<Route path="server" element={<ServerSettings />} />
			<Route path="jobs" element={<JobSettingsTab />} />
		</Route>
		<Route path="libraries/:id" element={<LibraryOverview />} />
		<Route path="libraries/:id/explorer" element={<LibraryFileExplorer />} />
		<Route path="series/:id" element={<SeriesOverview />} />
		<Route path="books/:id" element={<BookOverview />} />
		<Route path="books/:id/pages/:page" element={<ReadBook />} />
		<Route path="epub/:id" element={<ReadEpub />} />
		<Route path="epub/:id/loc/:loc" element={<ReadEpub />} />
	</Route>

	<Route path="/auth" element={<BaseLayout />}>
		<Route path="login" element={<Login />} />
	</Route>
	<Route path="*" element={<FourOhFour />} /> */}
		</Routes>
	);
}
