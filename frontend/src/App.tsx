import React from 'react';
import { QueryClientProvider } from 'react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import client from '~api/client';
import ErrorBoundary from '~components/ErrorBoundary';
import BaseLayout from '~components/Layouts/BaseLayout';
import MainLayout from '~components/Layouts/MainLayout';
import Notifications from '~components/Notifications';
import FourOhFour from '~pages/FourOhFour';
import StoreProvider from '~store/StoreProvider';
import theme from '~util/theme';

import { ChakraProvider } from '@chakra-ui/react';
import JobOverlay from '~components/JobOverlay';

const Home = React.lazy(() => import('~pages/Home'));
const Library = React.lazy(() => import('~pages/Library'));
const SeriesOverview = React.lazy(() => import('~pages/SeriesOverview'));
const BookOverview = React.lazy(() => import('~pages/Book/BookOverview'));
const ReadBook = React.lazy(() => import('~pages/Book/ReadBook'));
const Login = React.lazy(() => import('~pages/Auth/Login'));
const Settings = React.lazy(() => import('~pages/Settings'));

export default function Root() {
	return (
		<ErrorBoundary>
			<QueryClientProvider client={client}>
				<ChakraProvider theme={theme}>
					<StoreProvider>
						<App />
					</StoreProvider>
				</ChakraProvider>
			</QueryClientProvider>
		</ErrorBoundary>
	);
}

function App() {
	return (
		<>
			<BrowserRouter>
				<Routes>
					<Route path="/books/:id/pages/:page" element={<ReadBook />} />
					<Route path="/" element={<MainLayout />}>
						<Route path="" element={<Home />} />
						<Route path="settings" element={<Settings />} />
						<Route path="libraries/:id" element={<Library />} />
						<Route path="series/:id" element={<SeriesOverview />} />
						<Route path="books/:id" element={<BookOverview />} />
					</Route>
					<Route path="/auth" element={<BaseLayout />}>
						<Route path="login" element={<Login />} />
					</Route>
					<Route path="*" element={<FourOhFour />} />
				</Routes>
			</BrowserRouter>
			<Notifications />
			{/* <JobOverlay /> */}
		</>
	);
}
