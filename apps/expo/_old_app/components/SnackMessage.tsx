import { Warning } from 'phosphor-react-native'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'

export const ErrorSnack = ({ message }: { message: string }) => {
	const [show, setShow] = useState(false)

	useEffect(() => {
		setShow(true)
		setTimeout(() => {
			setShow(false)
		}, 5000)
	}, [message])

	return (
		show && (
			<View className="absolute bottom-5 flex w-full flex-row items-center justify-center rounded-md bg-red-600 p-4">
				<Warning color="#fff" />
				<Text className="ml-5 font-medium text-white">{message}</Text>
			</View>
		)
	)
}
