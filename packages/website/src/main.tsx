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
			<div className="min-h-[calc(100vh-56px)] max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8">
				<main className="flex flex-col items-center py-12 lg:py-16 h-full w-full">
					{useRoutes(routes)}
				</main>
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
