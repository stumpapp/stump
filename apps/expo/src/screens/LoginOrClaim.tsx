import { zodResolver } from '@hookform/resolvers/zod'
import { useLoginOrRegister } from '@stump/client'
import { StatusBar } from 'expo-status-bar'
import React, { useCallback } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Alert, Button, Text, TextInput, View } from 'react-native'
import { z } from 'zod'

import { useUserStore } from '@/stores'

// One thing I have NO clue about is how auth will actually wind up working for
// the mobile app. Stump doesn't currently issue session tokens, just session cookies
// being sent/set. I RN handles this in a secure way out the gate, perhaps we are clear.
// However, my guess would be it doesn't?
//
// Adding tokens which can be pulled from the store for each request (:weary:)
// might be required.

export default function LoginOrClaim() {
	const setUser = useUserStore((store) => store.setUser)
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
			} catch (error) {
				// TODO: alert error or set error somewhere
			}
		},
		[isClaimed, loginUser, registerUser],
	)

	const isLoading = isCheckingClaimed || isLoggingIn || isRegistering

	return (
		<View className="flex-1 items-center justify-center">
			<Text>I am logging in (or claiming server)</Text>

			<Controller
				control={control}
				rules={{
					required: true,
				}}
				render={({ field: { onChange, onBlur, value } }) => (
					<TextInput placeholder="Username" onBlur={onBlur} onChangeText={onChange} value={value} />
				)}
				name="username"
			/>
			{errors.username && <Text>{errors.username.message}</Text>}

			<Controller
				control={control}
				rules={{
					required: true,
				}}
				render={({ field: { onChange, onBlur, value } }) => (
					<TextInput
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

			<Button title="Submit" onPress={handleSubmit(onSubmit)} disabled={isLoading} />

			<StatusBar style="auto" />
		</View>
	)
}
