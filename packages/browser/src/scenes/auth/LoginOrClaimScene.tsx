import { zodResolver } from '@hookform/resolvers/zod'
import { queryClient, useLoginOrRegister } from '@stump/client'
import { Alert, Button, cx, Form, Heading, Input } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { isAxiosError } from '@stump/sdk'
import { motion, Variants } from 'framer-motion'
import { ArrowLeft, ArrowRight, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Navigate } from 'react-router'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { ConfiguredServersList } from '@/components/savedServer'
import { useAppStore, useUserStore } from '@/stores'

export default function LoginOrClaimScene() {
	const [params] = useSearchParams()
	const redirect = params.get('redirect') || '/'

	const [showServers, setShowServers] = useState(false)

	const { user, setUser } = useUserStore((store) => ({
		setUser: store.setUser,
		user: store.user,
	}))
	const isDesktop = useAppStore((store) => store.platform !== 'browser')

	const { t } = useLocaleContext()
	const {
		isClaimed,
		isCheckingClaimed,
		loginUser,
		registerUser,
		isLoggingIn,
		isRegistering,
		loginError,
	} = useLoginOrRegister({
		onSuccess: setUser,
		refetchClaimed: !showServers,
	})

	const schema = z.object({
		password: z.string().min(1, { message: t('authScene.form.validation.missingPassword') }),
		username: z.string().min(1, { message: t('authScene.form.validation.missingUsername') }),
	})

	const form = useForm<z.infer<typeof schema>>({
		resolver: zodResolver(schema),
	})

	async function handleSubmit(values: FieldValues) {
		const { username, password } = values
		const doLogin = async (firstTime = false) =>
			toast.promise(loginUser({ password, username }), {
				error: t('authScene.toasts.loginFailed'),
				loading: t('authScene.toasts.loggingIn'),
				success: firstTime
					? t('authScene.toasts.loggedInFirstTime')
					: t('authScene.toasts.loggedIn'),
			})
		if (isClaimed) {
			try {
				await doLogin()
			} catch (_) {
				// We already report the error from above with toast, but
				// it still throws there error (annoyingly). In order for
				// the form to not log up (i.e. get stuck in submitting state)
				// we need to at the very least catch the error here
			}
		} else {
			toast
				.promise(registerUser({ password, username }), {
					error: t('authScene.toasts.registrationFailed'),
					loading: t('authScene.toasts.registering'),
					success: t('authScene.toasts.registered'),
				})
				.then(() => doLogin(true))
		}
	}

	if (user) {
		queryClient.invalidateQueries(['getLibraries'])
		// NOTE: if swagger UI, we need a redirect outside of react-router context, otherwise
		// we will get a 404 trying to route to a server-rendered page via react-router
		if (redirect.includes('/swagger')) {
			window.location.href = redirect
			return null
		}

		return <Navigate to={redirect} />
	} else if (isCheckingClaimed) {
		return null
	}

	const renderHeader = () => {
		if (isClaimed) {
			return (
				<div className="flex flex-shrink-0 items-center justify-center gap-4 px-2">
					<img src="/assets/favicon.png" width="80" height="80" />
					<Heading variant="gradient" size="3xl" className="font-bold">
						Stump
					</Heading>
				</div>
			)
		} else {
			return (
				<div className="text-left sm:max-w-md md:max-w-lg">
					<h1 className="text-4xl font-semibold text-foreground">{t('authScene.claimHeading')}</h1>
					<p className="mt-1.5 text-base text-foreground-subtle">{t('authScene.claimText')}</p>
				</div>
			)
		}
	}

	const renderError = () => {
		if (!loginError) return null

		// If the response is a 403, and we are NOT claiming, it is likely because
		// the account login is disabled (i.e. the account is locked). Additionally,
		// authentication had to have passed, otherwise we would have gotten a 401. So,
		// we can safely display the error message from the server.
		if (isAxiosError(loginError) && loginError.response?.status === 403) {
			const message = loginError.response?.data as string
			return (
				<Alert level="error" icon={ShieldAlert} className="sm:max-w-md md:max-w-lg">
					<Alert.Content>{message || 'An unknown error occurred'}</Alert.Content>
				</Alert>
			)
		}

		return null
	}

	return (
		// <div className="flex h-full w-full flex-col items-center justify-center gap-8 bg-background p-4">
		<div data-tauri-drag-region className="flex h-screen w-screen items-center bg-background">
			<motion.div
				className="w-screen shrink-0"
				animate={showServers ? 'appearOut' : 'appearIn'}
				variants={variants}
			>
				<div className="flex h-full w-full flex-col items-center justify-center gap-8 bg-background p-4">
					{renderHeader()}
					{renderError()}

					<Form
						form={form}
						onSubmit={handleSubmit}
						className={cx(
							{ 'w-full sm:max-w-md md:max-w-lg': !isClaimed },
							{ 'min-w-[20rem]': isClaimed },
						)}
					>
						<Input
							id="username"
							label={t('authScene.form.labels.username')}
							variant="primary"
							autoComplete="username"
							autoFocus
							fullWidth
							{...form.register('username')}
						/>

						<Input
							id="password"
							label={t('authScene.form.labels.password')}
							variant="primary"
							type="password"
							autoComplete="current-password"
							fullWidth
							{...form.register('password')}
						/>

						<Button
							size="md"
							type="submit"
							variant={isClaimed ? 'primary' : 'secondary'}
							isLoading={isLoggingIn || isRegistering}
							className="mt-2"
						>
							{isClaimed
								? t('authScene.form.buttons.login')
								: t('authScene.form.buttons.createAccount')}
						</Button>

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
					</Form>
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
								{t('common.logIn')}
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
