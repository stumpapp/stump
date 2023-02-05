import {
	Alert,
	AlertIcon,
	Button,
	Container,
	FormControl,
	FormLabel,
	HStack,
	Stack,
	Text,
} from '@chakra-ui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { queryClient, useLoginOrRegister, useUserStore } from '@stump/client'
import { FieldValues, useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Navigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { useLocale } from '../hooks/useLocale'
import Form from '../ui/Form'
import Input from '../ui/Input'

export default function LoginOrClaim() {
	const [params] = useSearchParams()

	const { user, setUser } = useUserStore((store) => ({
		setUser: store.setUser,
		user: store.user,
	}))

	const { t } = useLocale()

	const { isClaimed, isCheckingClaimed, loginUser, registerUser, isLoggingIn, isRegistering } =
		useLoginOrRegister({
			onSuccess: setUser,
		})

	const schema = z.object({
		password: z.string().min(1, { message: t('loginPage.form.validation.missingPassword') }),
		username: z.string().min(1, { message: t('loginPage.form.validation.missingUsername') }),
	})

	const form = useForm({
		resolver: zodResolver(schema),
	})

	async function handleSubmit(values: FieldValues) {
		const { username, password } = values
		const doLogin = async (firstTime = false) =>
			toast.promise(loginUser({ password, username }), {
				error: t('loginPage.toasts.loginFailed'),
				loading: t('loginPage.toasts.loggingIn'),
				success: firstTime
					? t('loginPage.toasts.loggedInFirstTime')
					: t('loginPage.toasts.loggedIn'),
			})
		if (isClaimed) {
			await doLogin()
		} else {
			toast
				.promise(registerUser({ password, username }), {
					error: t('loginPage.toasts.registrationFailed'),
					loading: t('loginPage.toasts.registering'),
					success: t('loginPage.toasts.registered'),
				})
				.then(() => doLogin(true))
		}
	}

	if (user) {
		queryClient.invalidateQueries(['getLibraries'])
		return <Navigate to={params.get('redirect') || '/'} />
	} else if (isCheckingClaimed) {
		return null
	}

	return (
		<Stack as={Container} p="4" spacing={4}>
			<HStack px={2} flexShrink={0} justifyContent="center" alignItems="center" spacing="4">
				<img src="/assets/favicon.png" width="120" height="120" />
				<Text
					bgGradient="linear(to-r, brand.600, brand.200)"
					bgClip="text"
					fontSize="4xl"
					fontWeight="bold"
				>
					Stump
				</Text>
			</HStack>

			{!isClaimed && (
				<Alert status="warning" rounded="md">
					<AlertIcon />
					{t('loginPage.claimText')}
				</Alert>
			)}

			<Form form={form} onSubmit={handleSubmit}>
				<FormControl>
					<FormLabel htmlFor="username">{t('loginPage.form.labels.username')}</FormLabel>
					<Input type="text" autoFocus {...form.register('username')} />
				</FormControl>

				<FormControl>
					<FormLabel htmlFor="passowrd">{t('loginPage.form.labels.password')}</FormLabel>
					<Input type="password" {...form.register('password')} />
				</FormControl>

				<Button
					isLoading={isLoggingIn || isRegistering}
					type="submit"
					color="gray.100"
					bgGradient="linear(to-r, brand.600, brand.400)"
					_hover={{ bgGradient: 'linear(to-r, brand.700, brand.500)' }}
				>
					{isClaimed
						? t('loginPage.form.buttons.login')
						: t('loginPage.form.buttons.createAccount')}
				</Button>
			</Form>
		</Stack>
	)
}
