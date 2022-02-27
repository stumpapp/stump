import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from 'react-query';
import MainLayout from '~components/layouts/MainLayout';
import FourOhFour from '~pages/FourOhFour';
import Login from '~pages/Login';
import Settings from '~pages/Settings';
import theme from '~util/theme';
import client from '~api/client';
import ErrorBoundary from '~components/ErrorBoundary';

const Home = React.lazy(() => import('~pages/Home'));
const Libraries = React.lazy(() => import('~pages/Libraries'));

export default function App() {
	return (
		<ErrorBoundary>
			<QueryClientProvider client={client}>
				<ChakraProvider theme={theme}>
					<BrowserRouter>
						<Routes>
							<Route path="/" element={<MainLayout />}>
								<Route path="" element={<Home />} />
								<Route path="libraries/:id" element={<Libraries />} />
							</Route>
							<Route path="/settings" element={<Settings />} />
							<Route path="/login" element={<Login />} />
							<Route path="*" element={<FourOhFour />} />
						</Routes>
					</BrowserRouter>
				</ChakraProvider>
			</QueryClientProvider>
		</ErrorBoundary>
	);
}
