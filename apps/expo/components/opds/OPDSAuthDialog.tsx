import { zodResolver } from '@hookform/resolvers/zod'
import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { queryClient, useSDK } from '@stump/client'
import { Api, constants, OPDSAuthenticationDocument, resolveUrl } from '@stump/sdk'
import { opdsURL } from '@stump/sdk/controllers'
import { isAxiosError } from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Controller, useForm, useFormState } from 'react-hook-form'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import TurboImage from 'react-native-turbo-image'
import urlJoin from 'url-join'
import { z } from 'zod'

import { useColors } from '~/lib/constants'

import { useActiveServer } from '../activeServer'
import { Button, Input, Text } from '../ui'
import { HeaderButton } from '../ui/header-button/header-button'

type OPDSAuthDialogProps = {
	isOpen: boolean
	authDoc: OPDSAuthenticationDocument | null
	onClose: (newSdk?: Api) => void
}

export default function OPDSAuthDialog({ isOpen, authDoc, onClose }: OPDSAuthDialogProps) {
	const { activeServer } = useActiveServer()
	const { sdk } = useSDK()

	const ref = useRef<TrueSheet | null>(null)

	const [loginError, setLoginError] = useState<string | null>(null)
	const hasAuthSucceeded = useRef(false)

	const colors = useColors()
	const insets = useSafeAreaInsets()

	const { control, handleSubmit, reset } = useForm<LoginSchema>({
		resolver: zodResolver(schema),
	})
	const { errors } = useFormState({ control })

	useEffect(() => {
		if (isOpen) {
			hasAuthSucceeded.current = false
			setLoginError(null)
			reset()
			ref.current?.present()
		} else {
			ref.current?.dismiss()
		}
	}, [isOpen, reset])

	const handleDismiss = useCallback(() => {
		if (!hasAuthSucceeded.current) {
			onClose()
		}
	}, [onClose])

	const attemptRequest = useCallback(
		async ({ username, password }: Credentials) => {
			if (!activeServer) return false

			const shouldFormatURL = activeServer.kind === 'stump'
			const api = new Api({
				baseURL: activeServer.url,
				authMethod: 'basic',
				customHeaders: {
					[constants.STUMP_SAVE_BASIC_SESSION_HEADER]: 'false',
				},
				shouldFormatURL,
			})
			api.basicAuth = { username, password }

			const catalogURL = activeServer.stumpOPDS
				? urlJoin(activeServer.url, opdsURL('/catalog'))
				: activeServer.url

			await api.axios.get(catalogURL)

			return api
		},
		[activeServer],
	)

	const onSubmit = useCallback(
		async ({ username, password }: LoginSchema) => {
			try {
				const newApi = await attemptRequest({ username, password })
				if (!newApi) {
					setLoginError('Failed to authenticate')
					return
				}

				if (sdk?.customHeaders) {
					newApi.customHeaders = {
						...sdk.customHeaders,
						[constants.STUMP_SAVE_BASIC_SESSION_HEADER]: 'false',
					}
				}

				queryClient.clear()

				hasAuthSucceeded.current = true
				ref.current?.dismiss()
				onClose(newApi)
			} catch (error) {
				if (isAxiosError(error)) {
					setLoginError(error.message)
				} else {
					setLoginError('An error occurred')
				}
			}
		},
		[attemptRequest, sdk, onClose],
	)

	const basicAuth = authDoc?.authentication.find(
		(auth) => auth.type === 'http://opds-spec.org/auth/basic',
	)
	const logoLink = authDoc?.links.find((link) => link.rel === 'logo')
	const logoURL = logoLink?.href
		? resolveUrl(logoLink.href, sdk?.rootURL ?? activeServer?.url)
		: undefined

	const usernameLabel = basicAuth?.labels?.login || 'Username'
	const passwordLabel = basicAuth?.labels?.password || 'Password'

	return (
		<TrueSheet
			ref={ref}
			detents={['auto', 1]}
			cornerRadius={24}
			grabber
			backgroundColor={colors.background.DEFAULT}
			grabberOptions={{
				color: colors.sheet.grabber,
			}}
			onDidDismiss={handleDismiss}
			style={{
				paddingBottom: insets.bottom,
			}}
			header={
				<View className="mt-6 h-12 w-full items-start px-6">
					<HeaderButton
						onPress={() => ref.current?.dismiss()}
						ios={{
							variant: 'glass',
						}}
					/>
				</View>
			}
		>
			<View className="flex-1 items-start gap-4 p-6">
				{logoURL && (
					<View className="w-full items-center justify-center">
						<TurboImage
							className="self-center"
							source={{ uri: logoURL }}
							style={{ width: 100, height: 100 }}
						/>
					</View>
				)}

				{loginError && (
					<View className="squircle mb-2 rounded-xl bg-fill-danger-secondary p-2">
						<Text className="text-fill-danger">{loginError}</Text>
					</View>
				)}

				<Controller
					control={control}
					rules={{
						required: true,
					}}
					render={({ field: { onChange, onBlur, value } }) => (
						<Input
							label={usernameLabel}
							autoCorrect={false}
							autoCapitalize="none"
							autoComplete="username"
							textContentType="username"
							placeholder={usernameLabel}
							onBlur={onBlur}
							onChangeText={onChange}
							value={value}
							errorMessage={errors.username?.message}
						/>
					)}
					name="username"
				/>

				<Controller
					control={control}
					rules={{
						required: true,
					}}
					render={({ field: { onChange, onBlur, value } }) => (
						<Input
							label={passwordLabel}
							secureTextEntry
							autoCorrect={false}
							autoCapitalize="none"
							autoComplete="password"
							textContentType="password"
							placeholder={passwordLabel}
							onBlur={onBlur}
							onChangeText={onChange}
							value={value}
							errorMessage={errors.password?.message}
						/>
					)}
					name="password"
				/>

				<Button onPress={handleSubmit(onSubmit)} className="mt-4 w-full" variant="brand">
					<Text>Login</Text>
				</Button>
			</View>
		</TrueSheet>
	)
}

type Credentials = {
	username: string
	password: string
}

const schema = z.object({
	password: z.string().min(1, { message: 'Password is required' }),
	username: z.string().min(1, { message: 'Username is required' }),
})
type LoginSchema = z.infer<typeof schema>
