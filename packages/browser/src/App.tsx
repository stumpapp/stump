import './styles/index.css'
import '@stump/components/styles/overrides.css'

import { SDKProvider, StumpClientContextProvider, StumpClientProps } from '@stump/client'
import { defaultContext } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useEffect, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Helmet } from 'react-helmet'
import { BrowserRouter, createSearchParams, useLocation, useNavigate } from 'react-router-dom'

import { ErrorFallback } from '@/components/ErrorFallback'
import Notifications from '@/components/Notifications'

import { AppRouter } from './AppRouter'
import { useApplyTheme } from './hooks'
import { useAppStore, useUserStore } from './stores'

const IS_DEVELOPMENT = import.meta.env.MODE === 'development'

export default function StumpWebClient(props: StumpClientProps) {
	return (
		// FIXME: This can't be fixed like this, it would have to be runtime dynamic
		<BrowserRouter basename="/web">
			<ErrorBoundary FallbackComponent={ErrorFallback}>
				<RouterContainer {...props} />
			</ErrorBoundary>
		</BrowserRouter>
	)
}

function RouterContainer(props: StumpClientProps) {
	const location = useLocation()
	const navigate = useNavigate()

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

	useApplyTheme({ appFont: userPreferences?.app_font, appTheme: userPreferences?.app_theme })

	const { setUseDiscordPresence, setDiscordPresence } = props.tauriRPC ?? {}
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

	const handleUnauthenticatedResponse = (redirectUrl?: string) => {
		props.onUnauthenticatedResponse?.(redirectUrl)
		setUser(null)
		if (redirectUrl) {
			handleRedirect(redirectUrl)
		}
	}

	const handleConnectionWithServerChanged = (wasReached: boolean) => {
		setIsConnectedWithServer(wasReached)
		navigate('/server-connection-error')
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
				{IS_DEVELOPMENT && <ReactQueryDevtools position="bottom-right" context={defaultContext} />}
				<Helmet defaultTitle="Stump">
					<title>Stump</title>
				</Helmet>
				<AppRouter />
				<Notifications />
			</SDKProvider>
		</StumpClientContextProvider>
	)
}
