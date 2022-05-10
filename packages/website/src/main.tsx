import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, useRoutes } from 'react-router-dom';
import Spinner from '~components/Spinner';
import Footer from '~components/Footer';
import NavBar from '~components/NavBar';

import './styles/index.css';

import routes from '~react-pages';

function App() {
	return (
		<Suspense fallback={<Spinner />}>
			<NavBar />
			<div className="flex flex-col items-center min-h-[calc(100vh-2rem)] lg:min-h-[calc(100vh-3rem)] max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
				{useRoutes(routes)}
			</div>
			<Footer />
		</Suspense>
	);
}

const rootElement = document.getElementById('root');

if (!rootElement) {
	throw new Error('Root element not found');
}

const root = createRoot(rootElement);
root.render(
	<React.StrictMode>
		<Router>
			<App />
		</Router>
	</React.StrictMode>,
);
