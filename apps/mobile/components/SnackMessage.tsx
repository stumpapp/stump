import { Text, View } from 'react-native'
import { Warning } from 'phosphor-react-native'
import { useEffect, useState } from 'react'

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
			<View className="absolute bottom-5 flex flex-row justify-center items-center w-full bg-red-600 p-4 rounded-md">
				<Warning color="#fff" />
				<Text className="text-white font-medium ml-5">{message}</Text>
			</View>
		)
	)
}
