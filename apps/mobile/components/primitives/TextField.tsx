import { styled } from 'nativewind'
import React from 'react'
import { Text, TextInput } from 'react-native'

type TextFieldProps = {
	label?: string
	placeholder?: string
	value?: string
	onChange: (value: string) => void
	secureTextEntry?: boolean
}

const TextField = ({ label, value, placeholder, onChange, secureTextEntry }: TextFieldProps) => {
	return (
		<>
			{label && <Text className="mb-2 font-medium">{label}</Text>}
			<TextInput
				className="w-full rounded-md border border-black px-5 py-3"
				placeholder={placeholder}
				value={value}
				placeholderTextColor={'#999'}
				onChangeText={onChange}
				secureTextEntry={secureTextEntry}
			/>
		</>
	)
}

/// This allows for using nativewind's className prop
export default styled(TextField)
