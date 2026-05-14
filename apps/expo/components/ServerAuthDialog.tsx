import { zodResolver } from '@hookform/resolvers/zod'
import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useLoginOrRegister, useOidcConfig } from '@stump/client'
import { LoginResponse } from '@stump/sdk'
import { Eye, EyeOff } from 'lucide-react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Pressable, ScrollView, View } from 'react-native'
import TurboImage from 'react-native-turbo-image'
import urlJoin from 'url-join'
import { z } from 'zod'

import { useColors } from '~/lib/constants'
import { startOidcLogin } from '~/lib/sdk/auth'
import { useUserStore } from '~/stores'

import { useActiveServer } from './activeServer'
import { Button, Input, Text } from './ui'
import { Icon } from './ui/icon'

type ServerAuthDialogProps = {
	isOpen: boolean
	onClose: (resp?: LoginResponse) => void
}

export default function ServerAuthDialog({ isOpen, onClose }: ServerAuthDialogProps) {
	const setUser = useUserStore((state) => state.setUser)
	const { activeServer } = useActiveServer()
	const oidcConfig = useOidcConfig()
	const { isClaimed, isCheckingClaimed, loginUser, isLoggingIn } = useLoginOrRegister({
		onSuccess: setUser,
		onError: console.error,
	})

	const ref = useRef<TrueSheet>(null)

	const [isPasswordVisible, setIsPasswordVisible] = useState(false)
	const [isOidcLoading, setIsOidcLoading] = useState(false)
	const hasAuthSucceeded = useRef(false)

	const colors = useColors()

	const {
		control,
		formState: { errors },
		handleSubmit,
	} = useForm<LoginSchema>({
		resolver: zodResolver(schema),
	})

	useEffect(() => {
		if (isOpen) {
			hasAuthSucceeded.current = false
			ref.current?.present()
		} else {
			ref.current?.dismiss()
		}
	}, [isOpen])

	const handleDismiss = useCallback(() => {
		if (isOpen && !hasAuthSucceeded.current) {
			onClose()
		}
	}, [isOpen, onClose])

	const onSubmit = useCallback(
		async ({ username, password }: LoginSchema) => {
			try {
				const result = await loginUser({ password, username })
				if ('forUser' in result) {
					hasAuthSucceeded.current = true
					ref.current?.dismiss()
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

	const handleOidcLogin = useCallback(async () => {
		setIsOidcLoading(true)
		try {
			const result = await startOidcLogin({
				serverUrl: activeServer.url,
				saveToken: () => Promise.resolve(),
			})

			if (result) {
				setUser(result.forUser)
				hasAuthSucceeded.current = true
				ref.current?.dismiss()
				onClose(result)
			}
		} catch (error) {
			console.error('OIDC login error:', error)
		} finally {
			setIsOidcLoading(false)
		}
	}, [activeServer.url, setUser, onClose])

	if (!isClaimed && !isCheckingClaimed) {
		throw new Error('Not supported yet')
	}

	return (
		<TrueSheet
			ref={ref}
			detents={['auto', 1]}
			backgroundColor={colors.background.DEFAULT}
			grabber
			grabberOptions={{ color: colors.sheet.grabber }}
			onDidDismiss={handleDismiss}
			scrollable={false}
		>
			<ScrollView className="p-6">
				<View className="gap-4 items-start">
					<View className="w-full items-center justify-center">
						<TurboImage
							className="self-center"
							source={{ uri: urlJoin(activeServer.url, '/favicon.ico') }}
							style={{ width: 100, height: 100 }}
						/>
					</View>

					<Controller
						control={control}
						rules={{
							required: true,
						}}
						render={({ field: { onChange, onBlur, value } }) => (
							<Input
								label="Username"
								autoCorrect={false}
								autoCapitalize="none"
								autoComplete="username"
								textContentType="username"
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
							<View className="gap-1.5 w-full">
								<Text className="text-base font-medium text-foreground-muted">Password</Text>
								<View className="relative flex-row items-center">
									<Input
										secureTextEntry={!isPasswordVisible}
										autoCorrect={false}
										autoCapitalize="none"
										autoComplete="password"
										textContentType="password"
										placeholder="Password"
										onBlur={onBlur}
										onChangeText={onChange}
										value={value}
										className="pr-12 flex-1"
									/>
									<Pressable
										onPress={() => setIsPasswordVisible(!isPasswordVisible)}
										className="right-3 h-8 w-8 absolute items-center justify-center"
									>
										<Icon
											as={isPasswordVisible ? EyeOff : Eye}
											size={20}
											className="text-foreground-muted"
										/>
									</Pressable>
								</View>
								{errors.password?.message && (
									<Text className="text-sm text-fill-danger">{errors.password.message}</Text>
								)}
							</View>
						)}
						name="password"
					/>

					<View className="gap-4 w-full">
						<Button
							onPress={handleSubmit(onSubmit)}
							className="mt-4 w-full"
							roundness="full"
							disabled={isLoggingIn}
							variant="brand"
						>
							<Text>Login</Text>
						</Button>

						{oidcConfig?.enabled && (
							<>
								<View className="flex-row items-center">
									<View className="flex-1 border-t border-edge" />
									<Text className="mx-2 text-sm text-foreground-muted">Or</Text>
									<View className="flex-1 border-t border-edge" />
								</View>

								<Button
									onPress={handleOidcLogin}
									className="w-full"
									disabled={isOidcLoading || isLoggingIn}
									roundness="full"
									variant="secondary"
								>
									<Text>Login with OIDC</Text>
								</Button>
							</>
						)}
					</View>
				</View>
			</ScrollView>
		</TrueSheet>
	)
}

const schema = z.object({
	password: z.string().min(1, { message: 'Password must be at least 2 characters long' }),
	username: z.string().min(1, { message: 'Username is required' }),
})
type LoginSchema = z.infer<typeof schema>
