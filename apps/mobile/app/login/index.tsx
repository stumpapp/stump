import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { useLoginOrRegister, useUserStore } from '@stump/client'

export default function Login() {
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')

	const { user, setUser } = useUserStore((store) => ({
		setUser: store.setUser,
		user: store.user,
	}))

	const handleSubmit = () => {}

	return (
		<View className="flex-1 justify-center px-10 bg-gray-950">
			<Text className="mb-2 font-medium text-white">Username</Text>
			<TextInput
				className="border border-white w-full py-3 px-5 text-white"
				placeholder="username"
				placeholderTextColor={'#999'}
				onChangeText={setUsername}
			/>
			<Text className="mb-2 mt-5 font-medium text-white">Password</Text>
			<TextInput
				className="border border-white w-full py-3 px-5 text-white"
				secureTextEntry
				onChangeText={setPassword}
			/>
			<TouchableOpacity
				className="bg-blue-500 rounded-lg p-3 px-6 mx-auto mt-10"
				onPress={handleSubmit}
			>
				<Text className="text-white">Login</Text>
			</TouchableOpacity>
		</View>
	)
}
