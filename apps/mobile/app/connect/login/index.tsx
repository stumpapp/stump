import { useLoginOrRegister, useUserStore } from '@stump/client'
import { Stack } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Text, View } from 'react-native'

import { PrimaryButton } from '../../../components/primitives/Buttons'
import TextField from '../../../components/primitives/TextField'
import { ErrorSnack } from '../../../components/SnackMessage'

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
		<View className="flex-1 justify-center px-10">
			<Stack.Screen options={{ title: 'Login to Stump' }} />
			<TextField label="Username" onChange={setUsername} placeholder={'username'} />
			<View className={'mt-5'} />
			<TextField label="Password" onChange={setPassword} placeholder={'password'} secureTextEntry />
			<PrimaryButton
				label={isClaimed ? 'Login' : 'Register'}
				onTap={!isRegistering && !isLoggingIn && handleSubmit}
			/>

			{error && <ErrorSnack message={error} />}
		</View>
	)
}
