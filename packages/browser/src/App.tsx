import './styles/index.css'
import '@stump/components/styles/overrides.css'

import { SDKProvider, StumpClientContextProvider, StumpClientProps } from '@stump/client'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useEffect, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Helmet } from 'react-helmet'
import { BrowserRouter, createSearchParams, useLocation, useNavigate } from 'react-router-dom'

import { ErrorFallback } from '@/components/ErrorFallback'

import { AppRouter } from './AppRouter'
import { Toaster } from './components/Toaster'
import { useApplyTheme } from './hooks'
import { useAppStore, useDebugStore, useUserStore } from './stores'

export default function StumpWebClient(props: StumpClientProps) {
	return (
		<BrowserRouter>
			<ErrorBoundary FallbackComponent={ErrorFallback}>
				<RouterContainer {...props} />
			</ErrorBoundary>
		</BrowserRouter>
	)
}

const RouterContainer = (props: StumpClientProps) => {
	const location = useLocation()
	const navigate = useNavigate()

	const showQueryTools = useDebugStore((state) => state.showQueryTools)

	const [mounted, setMounted] = useState(false)

	const { setUser, userPreferences } = useUserStore((store) => ({
		setUser: store.setUser,
		userPreferences: store.userPreferences,
	}))
	const { baseUrl, setBaseUrl, setPlatform, setIsConnectedWithServer } = useAppStore((store) => ({
		baseUrl: store.baseUrl,
		setBaseUrl: store.setBaseUrl,
		setIsConnectedWithServer: store.setIsConnectedWithServer,
		setPlatform: store.setPlatform,
	}))

	useEffect(() => {
		if (!baseUrl && props.baseUrl) {
			setBaseUrl(props.baseUrl)
		}

		setMounted(true)
	}, [baseUrl, props.baseUrl, setBaseUrl])

	useEffect(() => {
		setPlatform(props.platform)
	}, [props.platform, setPlatform])

	useApplyTheme({ appFont: userPreferences?.appFont, appTheme: userPreferences?.appTheme })

	const { setUseDiscordPresence, setDiscordPresence } = props.tauriRPC ?? {}
	const discordPresenceEnabled = userPreferences?.enableDiscordPresence ?? false
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

	const handleUnauthenticatedResponse = (redirectUrl?: string) => {
		props.onUnauthenticatedResponse?.(redirectUrl)
		setUser(null)
		if (redirectUrl) {
			handleRedirect(redirectUrl)
		}
	}

	const handleConnectionWithServerChanged = (wasReached: boolean) => {
		setIsConnectedWithServer(wasReached)
	}

	if (!mounted) {
		return null
	}

	return (
		<StumpClientContextProvider
			onUnauthenticatedResponse={handleUnauthenticatedResponse}
			onConnectionWithServerChanged={handleConnectionWithServerChanged}
			tauriRPC={props.tauriRPC}
			onAuthenticated={props.onAuthenticated}
			onLogout={props.onLogout}
		>
			<SDKProvider baseURL={baseUrl || ''} authMethod={props.authMethod || 'session'}>
				{showQueryTools && <ReactQueryDevtools position="right" />}
				<Helmet defaultTitle="Stump">
					<title>Stump</title>
				</Helmet>
				<AppRouter />
				<Toaster />
			</SDKProvider>
		</StumpClientContextProvider>
	)
}
