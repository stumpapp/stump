import { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Helmet } from 'react-helmet';
import { BrowserRouter } from 'react-router-dom';

import { ChakraProvider } from '@chakra-ui/react';
import {
	AppProps,
	AppPropsContext,
	JobContextProvider,
	queryClient,
	useStumpStore,
	useTopBarStore,
} from '@stump/client';
import { initializeApi } from '@stump/client/api';
import { defaultContext, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { AppRouter } from './AppRouter';
import { chakraTheme } from './chakra';
import { ErrorFallback } from './components/ErrorFallback';

import Notifications from './components/Notifications';

function RouterContainer(props: { appProps: AppProps }) {
	const [mounted, setMounted] = useState(false);
	const [appProps, setAppProps] = useState(props.appProps);

	const { baseUrl, setBaseUrl } = useStumpStore();
	const { setTitle } = useTopBarStore();

	useEffect(() => {
		if (!baseUrl && appProps.baseUrl) {
			setBaseUrl(appProps.baseUrl);
		} else if (baseUrl) {
			initializeApi(baseUrl);

			setAppProps((appProps) => ({
				...appProps,
				baseUrl,
			}));
		}

		setMounted(true);
	}, [baseUrl]);

	function handleHelmetChange(newState: any, _: any, __: any) {
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

	if (!mounted) {
		// TODO: suspend
		return null;
	}

	return (
		<AppPropsContext.Provider value={appProps}>
			<Helmet defaultTitle="Stump" onChangeClientState={handleHelmetChange}>
				<title>Stump</title>
			</Helmet>
			<BrowserRouter>
				<JobContextProvider>
					<AppRouter />
				</JobContextProvider>
			</BrowserRouter>
		</AppPropsContext.Provider>
	);
}

export default function StumpInterface(props: AppProps) {
	return (
		<ChakraProvider theme={chakraTheme}>
			<ErrorBoundary FallbackComponent={ErrorFallback}>
				<QueryClientProvider
					client={queryClient}
					// FIXME: this will be removed... https://github.com/TanStack/query/discussions/4252
					contextSharing={true}
				>
					{import.meta.env.MODE === 'development' && (
						<ReactQueryDevtools position="bottom-right" context={defaultContext} />
					)}
					<RouterContainer appProps={props} />
				</QueryClientProvider>
			</ErrorBoundary>

			<Notifications />
		</ChakraProvider>
	);
}
