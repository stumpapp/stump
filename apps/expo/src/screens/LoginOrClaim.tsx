import { zodResolver } from '@hookform/resolvers/zod'
import { useLoginOrRegister } from '@stump/client'
import { useCallback } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Image, Text, TouchableOpacity, View } from 'react-native'
import { z } from 'zod'

import { Input, ScreenRootView } from '@/components'
import { useUserStore } from '@/stores'

export default function LoginOrClaim() {
	const setUser = useUserStore((store) => store.setUser)
	const { isClaimed, isCheckingClaimed, loginUser, registerUser, isLoggingIn, isRegistering } =
		useLoginOrRegister({
			onSuccess: setUser,
			onError: console.error,
		})

	// TODO: generalize common form schemas between clients to the client package
	// TODO: move i18n to isolated package to be used between clients

	const schema = z.object({
		password: z.string().min(1, { message: 'Password must be at least 2 characters long' }),
		username: z.string().min(1, { message: 'Username is required' }),
	})
	type FormValues = z.infer<typeof schema>

	const {
		control,
		formState: { errors },
		handleSubmit,
	} = useForm<FormValues>({
		resolver: zodResolver(schema),
	})

	const onSubmit = useCallback(
		async ({ username, password }: FormValues) => {
			try {
				if (isClaimed) {
					await loginUser({ password, username })
				} else {
					await registerUser({ password, username })
					await loginUser({ password, username })
				}
			} catch {
				// TODO: alert error or set error somewhere
			}
		},
		[isClaimed, loginUser, registerUser],
	)

	const renderHeader = () => {
		if (isClaimed) {
			// just return a view with the icon.png:
			return (
				<View>
					{/* eslint-disable-next-line @typescript-eslint/no-require-imports */}
					<Image className="h-32 w-32" source={require('../../assets/images/icon.png')} />
				</View>
			)
		} else {
			return (
				<View className="items-center space-y-1">
					<Text className="text-xl font-bold">This server is uninitialized</Text>
					<Text className="mb-3 text-center text-sm">
						Enter a username and password to claim it
					</Text>
					{/* eslint-disable-next-line @typescript-eslint/no-require-imports */}
					<Image className="h-24 w-24" source={require('../../assets/images/icon.png')} />
				</View>
			)
		}
	}

	const isLoading = isCheckingClaimed || isLoggingIn || isRegistering

	return (
		<ScreenRootView classes="flex-1 flex-col items-center justify-center space-y-4" applyPadding>
			{renderHeader()}

			<View className="w-full">
				<Controller
					control={control}
					rules={{
						required: true,
					}}
					render={({ field: { onChange, onBlur, value } }) => (
						<Input
							autoCorrect={false}
							autoCapitalize="none"
							placeholder="Username"
							onBlur={onBlur}
							onChangeText={onChange}
							value={value}
						/>
					)}
					name="username"
				/>
				{errors.username && <Text>{errors.username.message}</Text>}
			</View>

			<View className="w-full">
				<Controller
					control={control}
					rules={{
						required: true,
					}}
					render={({ field: { onChange, onBlur, value } }) => (
						<Input
							secureTextEntry
							autoCorrect={false}
							autoCapitalize="none"
							placeholder="Password"
							onBlur={onBlur}
							onChangeText={onChange}
							value={value}
						/>
					)}
					name="password"
				/>
				{errors.password && <Text>{errors.password.message}</Text>}
			</View>

			<TouchableOpacity
				className="w-full rounded-md bg-orange-300 p-3"
				onPress={handleSubmit(onSubmit)}
				disabled={isLoading}
			>
				<Text className="text-center">{isClaimed ? 'Log in' : 'Create account'}</Text>
			</TouchableOpacity>
		</ScreenRootView>
	)
}
