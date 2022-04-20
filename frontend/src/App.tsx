import React from 'react';
import { QueryClientProvider } from 'react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import client from '~api/client';
import ErrorBoundary from '~components/ErrorBoundary';
import BaseLayout from '~components/layouts/BaseLayout';
import MainLayout from '~components/layouts/MainLayout';
import Notifications from '~components/Notifications';
import FourOhFour from '~pages/FourOhFour';
import StoreProvider from '~store/StoreProvider';
import theme from '~util/theme';

import { ChakraProvider } from '@chakra-ui/react';

const Home = React.lazy(() => import('~pages/Home'));
const Library = React.lazy(() => import('~pages/Library'));
const Series = React.lazy(() => import('~pages/Series'));
const Book = React.lazy(() => import('~pages/Book'));
const Login = React.lazy(() => import('~pages/Login'));
const Settings = React.lazy(() => import('~pages/Settings'));

export default function App() {
	return (
		<ErrorBoundary>
			<QueryClientProvider client={client}>
				<ChakraProvider theme={theme}>
					<StoreProvider>
						<BrowserRouter>
							<Routes>
								<Route path="/" element={<MainLayout />}>
									<Route path="" element={<Home />} />
									<Route path="settings" element={<Settings />} />
									<Route path="libraries/:id" element={<Library />} />
									<Route path="series/:id" element={<Series />} />
									<Route path="books/:id" element={<Book />} />
								</Route>
								<Route path="/auth" element={<BaseLayout />}>
									<Route path="login" element={<Login />} />
								</Route>
								<Route path="*" element={<FourOhFour />} />
							</Routes>
						</BrowserRouter>
						<Notifications />
					</StoreProvider>
				</ChakraProvider>
			</QueryClientProvider>
		</ErrorBoundary>
	);
}
