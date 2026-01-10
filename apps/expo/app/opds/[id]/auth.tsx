import { zodResolver } from '@hookform/resolvers/zod'
import { queryClient, useSDK } from '@stump/client'
import { Api, constants } from '@stump/sdk'
import { opdsURL } from '@stump/sdk/controllers'
import { isAxiosError } from 'axios'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Image, ScrollView, View } from 'react-native'
import urlJoin from 'url-join'
import { z } from 'zod'

import { useActiveServer } from '~/components/activeServer'
import { Button, Input, Text } from '~/components/ui'

type Credentials = {
	username: string
	password: string
}

type Params = {
	logoURL?: string
	login: string
	password: string
}

export default function Screen() {
	const { activeServer } = useActiveServer()
	const { sdk, setSDK } = useSDK()

	const { logoURL, ...labels } = useLocalSearchParams<Params>()

	const {
		control,
		formState: { errors },
		handleSubmit,
	} = useForm<LoginSchema>({
		resolver: zodResolver(schema),
	})
	const [loginError, setLoginError] = useState<string | null>(null)

	const router = useRouter()

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

			const catalgURL = activeServer.stumpOPDS
				? urlJoin(activeServer.url, opdsURL('/catalog'))
				: activeServer.url

			return api.axios.get(catalgURL)
		},
		[activeServer],
	)

	const onSubmit = useCallback(
		async ({ username, password }: LoginSchema) => {
			try {
				await attemptRequest({ username, password })
				const api = new Api({
					baseURL: activeServer.url,
					authMethod: 'basic',
					customHeaders: {
						[constants.STUMP_SAVE_BASIC_SESSION_HEADER]: 'false',
						...sdk.customHeaders,
					},
					shouldFormatURL: activeServer.kind === 'stump',
				})
				api.basicAuth = { username, password }
				setSDK(api)
				queryClient.clear()
				router.replace({
					pathname: '/opds/[id]',
					params: { id: activeServer.id },
				})
			} catch (error) {
				if (isAxiosError(error)) {
					setLoginError(error.message)
				} else {
					setLoginError('An error occurred')
				}
			}
		},
		[attemptRequest, sdk, setSDK, activeServer, router],
	)

	// TODO: This is not ideal..
	useEffect(() => {
		return () => {
			queryClient.clear()
		}
	}, [])

	return (
		<ScrollView className="flex-1 bg-background" contentInsetAdjustmentBehavior="automatic">
			<View className="flex-1 items-center gap-4 bg-background p-6">
				{logoURL && (
					<View className="w-full items-center justify-center">
						<Image
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
							label={labels.login || 'Username'}
							autoCorrect={false}
							autoCapitalize="none"
							placeholder="Username"
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
							label={labels.password || 'Password'}
							secureTextEntry
							autoCorrect={false}
							autoCapitalize="none"
							placeholder="Password"
							onBlur={onBlur}
							onChangeText={onChange}
							value={value}
							errorMessage={errors.password?.message}
						/>
					)}
					name="password"
				/>

				<Button
					onPress={handleSubmit(onSubmit)}
					className="mt-4 w-full"
					// disabled={isLoggingIn}
					variant="secondary"
				>
					<Text>Login</Text>
				</Button>
			</View>
		</ScrollView>
	)
}

const schema = z.object({
	password: z.string(),
	username: z.string(),
})
type LoginSchema = z.infer<typeof schema>
