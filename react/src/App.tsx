import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import MainLayout from './components/layouts/MainLayout';
import FourOhFour from '~pages/FourOhFour';
import Home from '~pages/Home';
import Libraries from '~pages/Libraries';
import Login from '~pages/Login';
import Settings from '~pages/Settings';
import theme from '~util/theme';

export default function App() {
	return (
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
	);
}
