import { authApi } from '@stump/api'
import { useUserStore } from '@stump/client'
import { Stack } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

import { PrimaryButton } from '../../components/primitives/Buttons'
import { ErrorSnack } from '../../components/SnackMessage'

export default function Settings() {
	//const router = useRouter()
	const setUser = useUserStore((store) => store.setUser)

	const [error, setError] = useState<string | undefined>(undefined)

	const handleLogout = async () => {
		setError(undefined)

		const res = await authApi.logout()
		if (res.status === 200) {
			setUser(null)
		}

		setError('There was an error logging you out. Please try again.')
	}

	return (
		<>
			<Stack.Screen options={{ title: 'Settings' }} />
			<View className={'flex-1 items-center justify-center'}>
				<PrimaryButton label={'Log Out'} onTap={handleLogout} />
			</View>

			{error && <ErrorSnack message={error} />}
		</>
	)
}
