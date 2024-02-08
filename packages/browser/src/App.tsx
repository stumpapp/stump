import './styles/index.css'
import '@stump/components/styles/overrides.css'

import { initializeApi } from '@stump/api'
import {
	StumpClientContextProvider,
	StumpClientProps,
	useAppStore,
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

export default function StumpWebClient(props: StumpClientProps) {
	return (
		<BrowserRouter>
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

	const { userPreferences } = useUserStore(({ userPreferences }) => ({ userPreferences }))
	const { baseUrl, setBaseUrl, setPlatform } = useAppStore((store) => ({
		baseUrl: store.baseUrl,
		setBaseUrl: store.setBaseUrl,
		setPlatform: store.setPlatform,
	}))

	useEffect(
		() => {
			if (!baseUrl && props.baseUrl) {
				setBaseUrl(props.baseUrl)
			} else if (baseUrl) {
				initializeApi(baseUrl, API_VERSION)
			}

			setMounted(true)
		},

		// eslint-disable-next-line react-hooks/exhaustive-deps
		[baseUrl],
	)

	useEffect(() => {
		setPlatform(props.platform)
	}, [props.platform, setPlatform])

	const appTheme = (userPreferences?.app_theme ?? 'light').toLowerCase()
	useEffect(() => {
		const html = document.querySelector('html')
		html?.classList.remove(...(html?.classList ?? []))
		html?.classList.add(appTheme)
	}, [appTheme])

	const { setUseDiscordPresence, setDiscordPresence } = props
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
		return null
	}

	return (
		<StumpClientContextProvider
			onRedirect={handleRedirect}
			setDiscordPresence={setDiscordPresence}
			setUseDiscordPresence={setUseDiscordPresence}
		>
			{IS_DEVELOPMENT && <ReactQueryDevtools position="bottom-right" context={defaultContext} />}
			<Helmet defaultTitle="Stump">
				<title>Stump</title>
			</Helmet>
			<AppRouter />
			<Notifications />
		</StumpClientContextProvider>
	)
}
