import './styles/index.css'
import '@stump/components/styles/overrides.css'

import { initializeApi } from '@stump/api'
import {
	AppProps,
	AppPropsContext,
	JobContextProvider,
	queryClient,
	StumpClientContextProvider,
	useStumpStore,
	useTopBarStore,
	useUserStore,
} from '@stump/client'
import { defaultContext, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useEffect, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Helmet } from 'react-helmet'
import { BrowserRouter, createSearchParams, useLocation, useNavigate } from 'react-router-dom'

import { AppRouter } from './AppRouter'
import { ErrorFallback } from './components/ErrorFallback'
import Notifications from './components/Notifications'
import { API_VERSION } from './index'

function RouterContainer(props: { appProps: AppProps }) {
	const location = useLocation()
	const navigate = useNavigate()

	const [mounted, setMounted] = useState(false)
	const [appProps, setAppProps] = useState(props.appProps)

	const setTitle = useTopBarStore(({ setTitle }) => setTitle)

	const { userPreferences } = useUserStore(({ userPreferences }) => ({ userPreferences }))
	const { baseUrl, setBaseUrl } = useStumpStore(({ baseUrl, setBaseUrl }) => ({
		baseUrl,
		setBaseUrl,
	}))

	useEffect(
		() => {
			if (!baseUrl && appProps.baseUrl) {
				setBaseUrl(appProps.baseUrl)
			} else if (baseUrl) {
				initializeApi(baseUrl, API_VERSION)

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

	const appTheme = (userPreferences?.app_theme ?? 'light').toLowerCase()
	useEffect(() => {
		if (appTheme === 'light') {
			document.querySelector('html')?.classList.remove('dark')
		} else {
			document.querySelector('html')?.classList.add('dark')
		}
	}, [appTheme])

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function handleHelmetChange(newState: any) {
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
			{import.meta.env.MODE === 'development' && (
				<ReactQueryDevtools position="bottom-right" context={defaultContext} />
			)}
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
		<>
			<BrowserRouter>
				<ErrorBoundary FallbackComponent={ErrorFallback}>
					<RouterContainer appProps={props} />
				</ErrorBoundary>
				<Notifications />
			</BrowserRouter>
		</>
	)
}
