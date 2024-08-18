import { queryClient } from '@stump/client'
import { useLocaleContext } from '@stump/i18n'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Navigate, useLocation } from 'react-router'

import ServerUrlForm from '@/components/ServerUrlForm'
import { useAppStore } from '@/stores'

export default function ServerConnectionErrorScene() {
	const location = useLocation()

	const [backOnline, setBackOnline] = useState(false)
	const [goHome, setGoHome] = useState(false)

	const { baseURL, platform } = useAppStore((store) => ({
		baseURL: store.baseUrl,
		platform: store.platform,
	}))
	const showForm = platform !== 'browser'

	const localeKey = `serverSOS.${showForm ? 'desktop' : 'web'}.message`
	const { t } = useLocaleContext()

	useEffect(() => {
		async function checkServer() {
			try {
				const res = await fetch(`${baseURL}/v1/ping`)
				if (res.ok) {
					const data = await res.text()
					if (data === 'pong') {
						queryClient.resetQueries()
						setBackOnline(true)
					}
				}
			} catch (e) {
				console.error(e)
			}
		}

		if (baseURL) {
			const interval = setInterval(() => {
				checkServer()
			}, 2000)

			return () => {
				clearInterval(interval)
			}
		}

		return undefined
	}, [baseURL])

	useEffect(
		() => {
			if (backOnline) {
				toast
					.promise(new Promise((resolve) => setTimeout(resolve, 2000)), {
						error: t('serverSOS.reconnectFailed'),
						loading: t('serverSOS.reconnected'),
						success: t('serverSOS.reconnected'),
					})
					.then(() => setGoHome(true))
			}
		},

		// eslint-disable-next-line react-hooks/exhaustive-deps
		[backOnline],
	)

	if (goHome) {
		const from = location.state?.from || '/'
		const to = from === '/server-connection-error' ? '/' : from
		return <Navigate to={to} />
	}

	return (
		<div
			data-tauri-drag-region
			className="mx-auto flex h-full w-full max-w-sm flex-col items-center justify-center gap-6 sm:max-w-md md:max-w-xl"
		>
			<div className="text-left">
				<h1 className="text-4xl font-semibold text-foreground">{t('serverSOS.heading')}</h1>
				<p className="mt-1.5 text-base text-foreground-subtle">{t(localeKey)}</p>
			</div>

			{showForm && (
				<div className="w-full">
					<ServerUrlForm />
				</div>
			)}
		</div>
	)
}
