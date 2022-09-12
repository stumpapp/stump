import {
	AppProps,
	AppPropsContext,
	initializeApi,
	queryClient,
	useStumpConfigStore,
} from '@stump/client';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClientProvider, defaultContext } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorFallback } from './components/ErrorFallback';
import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './AppRouter';
import { chakraTheme } from './chakra';

function RouterContainer(props: { appProps: AppProps }) {
	const [mounted, setMounted] = useState(false);
	const [appProps, setAppProps] = useState(props.appProps);

	const { baseUrl, setBaseUrl } = useStumpConfigStore();

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

	if (!mounted) {
		// TODO: suspend
		return null;
	}

	return (
		<AppPropsContext.Provider value={appProps}>
			<BrowserRouter>
				<AppRouter />
			</BrowserRouter>
		</AppPropsContext.Provider>
	);
}

export default function StumpInterface(props: AppProps) {
	return (
		<ChakraProvider theme={chakraTheme}>
			<ErrorBoundary FallbackComponent={ErrorFallback}>
				<QueryClientProvider client={queryClient} contextSharing={true}>
					{import.meta.env.MODE === 'development' && (
						<ReactQueryDevtools position="bottom-right" context={defaultContext} />
					)}
					<RouterContainer appProps={props} />
				</QueryClientProvider>
			</ErrorBoundary>
		</ChakraProvider>
	);
}
