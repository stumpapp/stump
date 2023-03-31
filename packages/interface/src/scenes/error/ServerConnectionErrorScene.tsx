import { queryClient, useAppProps } from '@stump/client'
import { Alert } from '@stump/components'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Navigate, useLocation } from 'react-router'

// import ServerUrlForm from '../../components/ServerUrlForm'
import { useLocaleContext } from '../../i18n/index'

export default function ServerConnectionErrorScene() {
	const [backOnline, setBackOnline] = useState(false)
	const [goHome, setGoHome] = useState(false)

	const location = useLocation()
	const appProps = useAppProps()
	const showForm = appProps?.platform !== 'browser'

	const localeKey = `serverSOS.${showForm ? 'desktop' : 'web'}.message`
	const { t } = useLocaleContext()

	const baseURL = appProps?.baseUrl
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
			}, 5000)

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
		// FIXME: first time fails to redirect
		return <Navigate to={to} />
	}

	return (
		<div
			data-tauri-drag-region
			className="mx-auto flex flex-col items-center justify-center gap-2 pt-12 md:pt-16"
		>
			<Alert level="error" className="max-w-3xl">
				<Alert.Content className="flex-col gap-1">
					<Alert.Title>{t('serverSOS.heading')}</Alert.Title>
					{t(localeKey)}
				</Alert.Content>
			</Alert>
			{/* {showForm && <ServerUrlForm />} */}
		</div>
	)
}
