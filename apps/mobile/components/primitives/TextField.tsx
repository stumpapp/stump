import React from 'react'
import { Text, TextInput, View } from 'react-native'

type TextFieldProps = {
	className?: string
	label?: string
	placeholder?: string
	value?: string
	onChange: (value: string) => void
	secureTextEntry?: boolean
}

const TextField = ({
	className,
	label,
	value,
	placeholder,
	onChange,
	secureTextEntry,
}: TextFieldProps) => {
	return (
		<View className={className}>
			{label && <Text className="mb-2 font-medium">{label}</Text>}
			<TextInput
				className="w-full rounded-md border border-black px-5 py-3"
				placeholder={placeholder}
				value={value}
				placeholderTextColor={'#999'}
				onChangeText={onChange}
				secureTextEntry={secureTextEntry}
			/>
		</View>
	)
}

export default TextField
