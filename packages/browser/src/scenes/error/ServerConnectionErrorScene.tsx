import { queryClient } from '@stump/client'
import { useLocaleContext } from '@stump/i18n'
import { motion, Variants } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { toast } from 'sonner'

import { ConfiguredServersList } from '@/components/savedServer'
import { useAppStore } from '@/stores'

export default function ServerConnectionErrorScene() {
	const location = useLocation()

	const [backOnline, setBackOnline] = useState(false)
	const [goHome, setGoHome] = useState(false)
	const [showServers, setShowServers] = useState(false)

	const { baseURL, platform } = useAppStore((store) => ({
		baseURL: store.baseUrl,
		platform: store.platform,
	}))
	const isDesktop = platform !== 'browser'

	const localeKey = `serverSOS.${isDesktop ? 'desktop' : 'web'}.message`
	const { t } = useLocaleContext()

	useEffect(() => {
		async function checkServer() {
			try {
				const res = await fetch(`${baseURL}/v2/ping`)
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

	useEffect(() => {
		if (backOnline) {
			toast.promise(
				new Promise((resolve) => setTimeout(resolve, 2000)).then(() => setGoHome(true)),
				{
					error: t('serverSOS.reconnectFailed'),
					loading: t('serverSOS.reconnected'),
					success: t('serverSOS.reconnected'),
				},
			)
		}
	}, [backOnline, t])

	if (goHome) {
		const from = location.state?.from || '/'
		const to = from === '/server-connection-error' ? '/' : from
		return <Navigate to={to} />
	}

	return (
		<div data-tauri-drag-region className="flex h-screen w-screen items-center bg-background">
			<motion.div
				className="w-screen shrink-0"
				animate={showServers ? 'appearOut' : 'appearIn'}
				variants={variants}
			>
				<div className="mx-auto flex h-full w-full max-w-sm flex-col items-start justify-center gap-6 sm:max-w-md md:max-w-xl">
					<div className="text-left">
						<h1 className="text-4xl font-semibold text-foreground">{t('serverSOS.heading')}</h1>
						<p className="mt-1.5 text-base text-foreground-subtle">{t(localeKey)}</p>
					</div>

					{isDesktop && (
						<button
							className="group flex w-full items-center justify-between border-l border-edge p-4 transition-colors duration-100 hover:border-edge-strong hover:border-opacity-70 hover:bg-background-surface/50"
							type="button"
							onClick={() => setShowServers(true)}
						>
							<span className="text-sm font-semibold text-foreground-muted transition-colors duration-100 group-hover:text-foreground-subtle">
								{t('common.goToServers')}
							</span>

							<ArrowRight className="h-5 w-5 text-foreground-muted group-hover:text-foreground-subtle" />
						</button>
					)}
				</div>
			</motion.div>

			{isDesktop && (
				<motion.div
					className="w-screen shrink-0"
					animate={showServers ? 'appearIn' : 'appearOut'}
					variants={variants}
				>
					<div className="mx-auto flex h-full w-full max-w-sm flex-col justify-start gap-6 sm:max-w-md md:max-w-xl">
						<ConfiguredServersList />
						<button
							className="group flex w-full items-center space-x-4 border-l border-edge p-4 transition-colors duration-100 hover:border-edge-strong hover:border-opacity-70 hover:bg-background-surface/50"
							type="button"
							onClick={() => setShowServers(false)}
						>
							<ArrowLeft className="h-5 w-5 text-foreground-muted group-hover:text-foreground-subtle" />

							<span className="text-sm font-semibold text-foreground-muted transition-colors duration-100 group-hover:text-foreground-subtle">
								{t('common.seeError')}
							</span>
						</button>
					</div>
				</motion.div>
			)}
		</div>
	)
}

const variants: Variants = {
	appearIn: {
		display: 'block',
		opacity: 1,
		scale: 1,
		transition: {
			damping: 20,
			delayChildren: 0.3,
			stiffness: 150,
			type: 'spring',
		},
	},
	appearOut: {
		display: 'none',
		opacity: 0,
		scale: 0.8,
	},
}
