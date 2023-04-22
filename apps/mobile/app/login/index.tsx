import { useLoginOrRegister, useUserStore } from '@stump/client'
import { Stack } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Text, TextInput, TouchableOpacity, View } from 'react-native'

import { ErrorSnack } from '../../components/SnackMessage'

export default function Login() {
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState<string | undefined>(undefined)

	/// reset error when username or password changes
	useEffect(() => {
		setError(undefined)
	}, [username, password])

	const { setUser } = useUserStore((store) => ({
		setUser: store.setUser,
	}))

	const { isClaimed, isCheckingClaimed, loginUser, registerUser, isLoggingIn, isRegistering } =
		useLoginOrRegister({
			onError: setError,
			onSuccess: setUser,
		})

	const handleSubmit = () => {
		if (isClaimed) {
			loginUser({ password, username })
			return
		}

		registerUser({ password, username }).then(() => {
			loginUser({ password, username })
		})
	}

	if (isCheckingClaimed) {
		return (
			<View>
				<Text>Checking if username is claimed...</Text>
			</View>
		)
	}

	return (
		<View className="flex-1 justify-center px-10 bg-gray-950">
			<Stack.Screen options={{ title: 'Login to Stump' }} />
			<Text className="mb-2 font-medium">Username</Text>
			<TextInput
				className="border border-black w-full py-3 px-5 rounded-md"
				placeholder="username"
				placeholderTextColor={'#999'}
				onChangeText={setUsername}
			/>
			<Text className="mb-2 mt-5 font-medium">Password</Text>
			<TextInput
				className="border border-black w-full py-3 px-5 rounded-md"
				secureTextEntry
				onChangeText={setPassword}
			/>
			<TouchableOpacity
				className="bg-gray-900 rounded-lg p-3 px-6 mx-auto mt-10"
				onPress={!isRegistering && !isLoggingIn && handleSubmit}
			>
				<Text className="text-white">Login</Text>
			</TouchableOpacity>

			{error && <ErrorSnack message={error} />}
		</View>
	)
}
