import React from 'react';
import { QueryClientProvider } from 'react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import client from '~api/client';
import ErrorBoundary from '~components/ErrorBoundary';
import BaseLayout from '~components/Layouts/BaseLayout';
import MainLayout from '~components/Layouts/MainLayout';
import Notifications from '~components/Notifications';
import JobOverlay from '~components/JobOverlay';
import FourOhFour from '~pages/FourOhFour';
import StoreProvider from '~store/StoreProvider';
import theme from '~util/theme';

import { ChakraProvider } from '@chakra-ui/react';
import { Helmet, HelmetTags } from 'react-helmet';
import { useStore } from '~store/store';
import { useJobsListener } from '~hooks/useJobsListener';
import toast from 'react-hot-toast';

const Home = React.lazy(() => import('~pages/Home'));
const Library = React.lazy(() => import('~pages/Library'));
const SeriesOverview = React.lazy(() => import('~pages/SeriesOverview'));
const BookOverview = React.lazy(() => import('~pages/Book/BookOverview'));
const ReadBook = React.lazy(() => import('~pages/Book/ReadBook'));
const ReadEpub = React.lazy(() => import('~pages/Book/ReadEpub'));
const Login = React.lazy(() => import('~pages/Auth/Login'));
const Settings = React.lazy(() => import('~pages/Settings'));
const GeneralSettings = React.lazy(() => import('~pages/Settings/GeneralSettings'));
const ServerSettings = React.lazy(() => import('~pages/Settings/ServerSettings'));

export default function Root() {
	return (
		<ChakraProvider theme={theme}>
			<ErrorBoundary>
				<QueryClientProvider client={client}>
					<StoreProvider>
						<App />
					</StoreProvider>
				</QueryClientProvider>
			</ErrorBoundary>
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

	const { addJob, updateJob, completeJob } = useStore(({ addJob, updateJob, completeJob }) => ({
		addJob,
		updateJob,
		completeJob,
	}));

	// FIXME: so the indexing on the backend is so quick that the UI doesn't appear to update lol
	// this isn't 'bad' but it appears as if nothing happens. A solution for this will need to be found.
	function handleJobEvent(data: JobEvent) {
		if (data.JobStarted) {
			addJob(data.JobStarted);
		} else if (data.JobProgress) {
			updateJob(data.JobProgress);
		} else if (data.JobComplete) {
			// completeJob(data.JobComplete as string);
			setTimeout(() => {
				completeJob(data.JobComplete as string);
				toast.success(`Job ${data.JobComplete} complete.`);
			}, 500);
		} else if (data.JobFailed) {
			setTimeout(() => {
				// completeJob(data.JobComplete as string);
				toast.error(`Job ${data.JobFailed} failed.`);
			}, 500);
		} else if (data.CreatedSeries || data.CreatedMedia) {
			// I set a timeout here to give the backend a little time to analyze at least
			// one of the books in a new series before triggering a refetch. This is to
			// prevent the series/media cards from being displayed before there is an image ready.
			setTimeout(() => client.invalidateQueries('getLibrary'), 250);

			if (data.CreatedMedia) {
				setTimeout(() => client.invalidateQueries('getSeries'), 250);
			}
		} else {
			console.log('Unknown JobEvent', data);
			console.log(Object.keys(data));
		}
	}

	useJobsListener({ onEvent: handleJobEvent });

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
							<Route path="server" element={<ServerSettings />} />
						</Route>
						<Route path="libraries/:id" element={<Library />} />
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
			<Notifications />
		</>
	);
}
