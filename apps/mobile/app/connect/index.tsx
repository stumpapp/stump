import { initializeApi, ping } from '@stump/api'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { PrimaryButton } from '../../components/primitives/Buttons'
import TextField from '../../components/primitives/TextField'
import { ErrorSnack } from '../../components/SnackMessage'

export default function Connect() {
	const router = useRouter()
	// TODO: Remove this and use the connection url from the user
	const [connectionUrl, setConnectionUrl] = useState<string | undefined>(
		'http://192.168.178.192:10801',
	)
	const [error, setError] = useState<string | undefined>(undefined)

	useEffect(() => {
		setError(undefined)
	}, [connectionUrl])

	const connect = async () => {
		initializeApi(connectionUrl, 'v1')
		try {
			const res = await ping()

			if (res.status !== 200) {
				setError('Could not connect to the server')
				return
			}
		} catch (e) {
			setError('Could not connect to the server')
			return
		}

		router.push('/login')
	}

	return (
		<View className="flex flex-1 items-center justify-center px-5">
			<TextField
				label="Connection URL"
				placeholder="http(s)://"
				onChange={setConnectionUrl}
				value={connectionUrl}
			/>
			<PrimaryButton label={'Connect'} onTap={connect} />

			{error && <ErrorSnack message={error} />}
		</View>
	)
}
