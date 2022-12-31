import './styles/index.css'

import { ChakraProvider } from '@chakra-ui/react'
import {
	AppProps,
	AppPropsContext,
	JobContextProvider,
	queryClient,
	StumpClientContextProvider,
	useStumpStore,
	useTopBarStore,
} from '@stump/client'
import { initializeApi } from '@stump/client/api'
import { defaultContext, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useEffect, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Helmet } from 'react-helmet'
import { BrowserRouter, createSearchParams, useLocation, useNavigate } from 'react-router-dom'

import { AppRouter } from './AppRouter'
import { chakraTheme } from './chakra'
import { ErrorFallback } from './components/ErrorFallback'
import Notifications from './components/Notifications'

function RouterContainer(props: { appProps: AppProps }) {
	const location = useLocation()
	const navigate = useNavigate()

	const [mounted, setMounted] = useState(false)
	const [appProps, setAppProps] = useState(props.appProps)

	const { baseUrl, setBaseUrl } = useStumpStore()
	const { setTitle } = useTopBarStore()

	useEffect(
		() => {
			if (!baseUrl && appProps.baseUrl) {
				setBaseUrl(appProps.baseUrl)
			} else if (baseUrl) {
				initializeApi(baseUrl)

				setAppProps((appProps) => ({
					...appProps,
					baseUrl,
				}))
			}

			setMounted(true)
		},

		// eslint-disable-next-line react-hooks/exhaustive-deps
		[baseUrl],
	)

	function handleHelmetChange(newState: any, _: any, __: any) {
		if (Array.isArray(newState?.title) && newState.title.length > 0) {
			if (newState.title.length > 1) {
				setTitle(newState.title[newState.title.length - 1])
			} else {
				setTitle(newState.title[0])
			}
		} else if (typeof newState?.title === 'string') {
			if (newState.title === 'Stump') {
				setTitle('')
			} else {
				setTitle(newState.title)
			}
		}
	}

	const handleRedirect = (url: string) => {
		navigate({
			pathname: url,
			search: createSearchParams({
				redirect: location.pathname,
			}).toString(),
		})
	}

	if (!mounted) {
		// TODO: suspend
		return null
	}

	return (
		<StumpClientContextProvider onRedirect={handleRedirect}>
			<AppPropsContext.Provider value={appProps}>
				<Helmet defaultTitle="Stump" onChangeClientState={handleHelmetChange}>
					<title>Stump</title>
				</Helmet>
				<JobContextProvider>
					<AppRouter />
				</JobContextProvider>
			</AppPropsContext.Provider>
		</StumpClientContextProvider>
	)
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
					<BrowserRouter>
						<RouterContainer appProps={props} />
					</BrowserRouter>
				</QueryClientProvider>
			</ErrorBoundary>
			<Notifications />
		</ChakraProvider>
	)
}
