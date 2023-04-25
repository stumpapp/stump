import { Text, TouchableOpacity } from 'nativewind/dist/preflight'

type ButtonProps = {
	label: string
	onTap: () => void
}

export const PrimaryButton = (props: ButtonProps) => {
	return (
		<TouchableOpacity
			className="mx-auto mt-10 rounded-lg bg-gray-900 p-3 px-6"
			onPress={props.onTap}
		>
			<Text className="text-white">{props.label}</Text>
		</TouchableOpacity>
	)
}
