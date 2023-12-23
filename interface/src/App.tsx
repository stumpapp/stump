import './styles/index.css'
import '@stump/components/styles/overrides.css'

import { initializeApi } from '@stump/api'
import {
	AppProps,
	AppPropsContext,
	JobContextProvider,
	StumpClientContextProvider,
	useStumpStore,
	useUserStore,
} from '@stump/client'
import { defaultContext } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useEffect, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Helmet } from 'react-helmet'
import { BrowserRouter, createSearchParams, useLocation, useNavigate } from 'react-router-dom'

import { ErrorFallback } from '@/components/ErrorFallback'
import Notifications from '@/components/Notifications'

import { AppRouter } from './AppRouter'
import { API_VERSION } from './index'

const IS_DEVELOPMENT = import.meta.env.MODE === 'development'

function RouterContainer(props: { appProps: AppProps }) {
	const location = useLocation()
	const navigate = useNavigate()

	const [mounted, setMounted] = useState(false)
	const [appProps, setAppProps] = useState(props.appProps)

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

	const { setUseDiscordPresence, setDiscordPresence } = appProps
	const discordPresenceEnabled = userPreferences?.enable_discord_presence ?? false
	useEffect(() => {
		setUseDiscordPresence?.(discordPresenceEnabled)
		if (discordPresenceEnabled) {
			setDiscordPresence?.()
		}
	}, [setUseDiscordPresence, setDiscordPresence, discordPresenceEnabled])

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
			{IS_DEVELOPMENT && <ReactQueryDevtools position="bottom-right" context={defaultContext} />}
			<AppPropsContext.Provider value={appProps}>
				<Helmet defaultTitle="Stump">
					<title>Stump</title>
				</Helmet>
				<JobContextProvider>
					<AppRouter />
				</JobContextProvider>
			</AppPropsContext.Provider>
			<Notifications />
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
			</BrowserRouter>
		</>
	)
}
