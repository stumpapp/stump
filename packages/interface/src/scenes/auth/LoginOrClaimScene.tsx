import { zodResolver } from '@hookform/resolvers/zod'
import { queryClient, useLoginOrRegister, useUserStore } from '@stump/client'
import { Button, Form, Heading, Input } from '@stump/components'
import { FieldValues, useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Navigate } from 'react-router'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { useLocaleContext } from '../../i18n/context'

export default function LoginOrClaimScene() {
	const [params] = useSearchParams()
	const redirect = params.get('redirect') || '/'

	const { user, setUser } = useUserStore((store) => ({
		setUser: store.setUser,
		user: store.user,
	}))

	const { t } = useLocaleContext()
	const { isClaimed, isCheckingClaimed, loginUser, registerUser, isLoggingIn, isRegistering } =
		useLoginOrRegister({
			onSuccess: setUser,
		})

	const schema = z.object({
		password: z.string().min(1, { message: t('authScene.form.validation.missingPassword') }),
		username: z.string().min(1, { message: t('authScene.form.validation.missingUsername') }),
	})

	const form = useForm({
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

	return (
		<div className="flex h-full w-full flex-col items-center gap-8 bg-white p-4 dark:bg-gray-975">
			<div className="flex flex-shrink-0 items-center justify-center gap-4 px-2">
				<img src="/assets/favicon.png" width="120" height="120" />
				<Heading variant="gradient" size="3xl" className="font-bold">
					Stump
				</Heading>
			</div>

			{/* {!isClaimed && (
				<Alert status="warning" rounded="md">
					<AlertIcon />
					{t('authScene.claimText')}
				</Alert>
			)} */}

			<Form form={form} onSubmit={handleSubmit} className="min-w-[20rem]">
				<Input
					id="username"
					label={t('authScene.form.labels.username')}
					variant="primary"
					autoComplete="username"
					autoFocus
					{...form.register('username')}
				/>

				<Input
					id="password"
					label={t('authScene.form.labels.password')}
					variant="primary"
					type="password"
					autoComplete="current-password"
					{...form.register('password')}
				/>

				<Button size="md" type="submit" variant="primary" isLoading={isLoggingIn || isRegistering}>
					{isClaimed
						? t('authScene.form.buttons.login')
						: t('authScene.form.buttons.createAccount')}
				</Button>
			</Form>
		</div>
	)
}
