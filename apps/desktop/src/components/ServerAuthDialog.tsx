import { zodResolver } from '@hookform/resolvers/zod'
import { useUserStore } from '@stump/browser/stores'
import { useLoginOrRegister, useOidcConfig, useSDK } from '@stump/client'
import { Button, Dialog, Input, PasswordInput, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { LoginResponse } from '@stump/sdk'
import { useCallback, useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

type ServerAuthDialogProps = {
	isOpen: boolean
	onClose: (resp?: LoginResponse) => void
}

export default function ServerAuthDialog({ isOpen, onClose }: ServerAuthDialogProps) {
	const setUser = useUserStore((store) => store.setUser)
	const { sdk } = useSDK()
	const { t } = useLocaleContext()
	const oidcConfig = useOidcConfig()
	const { isClaimed, isCheckingClaimed, loginUser, isLoggingIn } = useLoginOrRegister({
		onSuccess: setUser,
		onError: console.error,
	})

	const schema = useMemo(
		() =>
			z.object({
				username: z.string().min(1, { message: t('authScene.form.validation.missingUsername') }),
				password: z.string().min(1, { message: t('authScene.form.validation.missingPassword') }),
			}),
		[t],
	)

	const {
		control,
		formState: { errors },
		handleSubmit,
		reset,
	} = useForm<z.infer<typeof schema>>({
		resolver: zodResolver(schema),
		defaultValues: {
			username: '',
			password: '',
		},
	})

	useEffect(() => {
		if (isOpen) {
			reset()
		}
	}, [isOpen, reset])

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			onClose()
		}
	}

	const onSubmit = useCallback(
		async ({ username, password }: z.infer<typeof schema>) => {
			try {
				const result = await loginUser({ password, username })
				if ('forUser' in result) {
					onClose(result)
				} else {
					console.warn('Unexpected login response:', result)
				}
			} catch (error) {
				console.error(error)
			}
		},
		[loginUser, onClose],
	)

	const handleOidcLogin = useCallback(() => {
		const authorizeUrl = sdk.auth.getOidcAuthorizeUrl()
		window.location.href = authorizeUrl
	}, [sdk.auth])

	if (!isClaimed && !isCheckingClaimed) {
		return (
			<Dialog open={isOpen} onOpenChange={handleOpenChange}>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Server Setup Required</Dialog.Title>
					</Dialog.Header>
					<Text variant="muted">
						This server has not been claimed yet. Registration is not supported in the desktop app.
						Please use the web interface to complete the initial setup.
					</Text>
					<Dialog.Footer>
						<Button onClick={() => onClose()}>Close</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>
		)
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>{t('common.login')}</Dialog.Title>
					<Dialog.Description>You need to login to access this server</Dialog.Description>
				</Dialog.Header>

				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					<Controller
						control={control}
						name="username"
						render={({ field: { onChange, onBlur, value } }) => (
							<Input
								label={t('authScene.form.labels.username')}
								autoCorrect="off"
								autoCapitalize="none"
								autoComplete="username"
								placeholder={t('authScene.form.labels.username')}
								onBlur={onBlur}
								onChange={(e) => onChange(e.target.value)}
								value={value}
								errorMessage={errors.username?.message}
								fullWidth
							/>
						)}
					/>

					<Controller
						control={control}
						name="password"
						render={({ field: { onChange, onBlur, value } }) => (
							<PasswordInput
								label={t('authScene.form.labels.password')}
								autoCorrect="off"
								autoCapitalize="none"
								autoComplete="current-password"
								placeholder={t('authScene.form.labels.password')}
								onBlur={onBlur}
								onChange={(e) => onChange(e.target.value)}
								value={value}
								errorMessage={errors.password?.message}
								fullWidth
							/>
						)}
					/>

					<Dialog.Footer>
						<Button type="submit" disabled={isLoggingIn} variant="primary">
							{isLoggingIn ? t('authScene.toasts.loggingIn') : t('authScene.form.buttons.login')}
						</Button>
						<Button type="button" variant="outline" onClick={() => onClose()}>
							{t('common.cancel')}
						</Button>
					</Dialog.Footer>
				</form>

				{oidcConfig?.enabled && (
					<div className="mt-4">
						<div className="my-4 relative">
							<div className="inset-0 absolute flex items-center">
								<div className="w-full border-t border-edge" />
							</div>
							<div className="text-xs relative flex justify-center uppercase">
								<span className="px-2 bg-background text-foreground-muted">Or</span>
							</div>
						</div>

						<Button
							type="button"
							onClick={handleOidcLogin}
							className="w-full"
							disabled={isLoggingIn}
							variant="outline"
						>
							{t('authScene.form.buttons.loginWithOidc')}
						</Button>
					</div>
				)}
			</Dialog.Content>
		</Dialog>
	)
}
