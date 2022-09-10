import React from 'react';
import { Helmet, HelmetTags } from 'react-helmet';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import client from '~api/client';
import ErrorBoundary from '~components/ErrorBoundary';
import JobOverlay from '~components/JobOverlay';
import BaseLayout from '~components/Layouts/BaseLayout';
import MainLayout from '~components/Layouts/MainLayout';
import Notifications from '~components/Notifications';
import { useJobManager } from '~hooks/useJobManager';
import FourOhFour from '~pages/FourOhFour';
import { useStore } from '~stores/mainStore';
import StoreProvider from '~stores/StoreProvider';
import theme from '~util/chakraTheme';

import { ChakraProvider } from '@chakra-ui/react';
import { defaultContext, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const Home = React.lazy(() => import('~pages/Home'));
const LibraryOverview = React.lazy(() => import('~pages/Library/LibraryOverview'));
const LibraryFileExplorer = React.lazy(() => import('~pages/Library/LibraryFileExplorer'));
const SeriesOverview = React.lazy(() => import('~pages/SeriesOverview'));
const BookOverview = React.lazy(() => import('~pages/Book/BookOverview'));
const ReadBook = React.lazy(() => import('~pages/Book/ReadBook'));
const ReadEpub = React.lazy(() => import('~pages/Book/ReadEpub'));
const Login = React.lazy(() => import('~pages/Auth/Login'));
const Settings = React.lazy(() => import('~pages/Settings'));
const GeneralSettings = React.lazy(() => import('~pages/Settings/GeneralSettings'));
const UserSettings = React.lazy(() => import('~pages/Settings/UserSettings'));
const ServerSettings = React.lazy(() => import('~pages/Settings/ServerSettings'));
const JobSettingsTab = React.lazy(() => import('~pages/Settings/JobSettingsTab'));

// TODO: https://reactjs.org/docs/profiler.html for performance profiling and improvement

export default function Root() {
	return (
		<ChakraProvider theme={theme}>
			<ErrorBoundary>
				<QueryClientProvider client={client}>
					{/* TODO: apparently this automatically excludes from prod bundle, check this is true... */}
					<ReactQueryDevtools position="bottom-right" context={defaultContext} />
					<StoreProvider>
						<App />
					</StoreProvider>
				</QueryClientProvider>
			</ErrorBoundary>
			<Notifications />
		</ChakraProvider>
	);
}

function App() {
	const { title, setTitle } = useStore(({ setTitle, title }) => ({ setTitle, title }));

	function handleChangedClientState(newState: any, _: HelmetTags, __: HelmetTags) {
		if (Array.isArray(newState?.title) && newState.title.length > 0) {
			if (newState.title.length > 1) {
				setTitle(newState.title[newState.title.length - 1]);
			} else {
				setTitle(newState.title[0]);
			}
		} else if (typeof newState?.title === 'string') {
			if (newState.title === 'Stump') {
				setTitle('');
			} else {
				setTitle(newState.title);
			}
		}
	}

	useJobManager();

	return (
		<>
			<Helmet defaultTitle="Stump" onChangeClientState={handleChangedClientState}>
				<title>Stump</title>
			</Helmet>
			<BrowserRouter>
				<Routes>
					<Route path="/" element={<MainLayout />}>
						<Route path="" element={<Home />} />
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
					<Route path="*" element={<FourOhFour />} />
				</Routes>
				<JobOverlay />
			</BrowserRouter>
		</>
	);
}
