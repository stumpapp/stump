import * as React from 'react'
import { TextInput, type TextInputProps, View } from 'react-native'

import { Text } from '../text'
import { RawInput } from './raw-input'

export type InputProps = {
	label?: string
	errorMessage?: string
} & TextInputProps

const Input = React.forwardRef<React.ElementRef<typeof TextInput>, InputProps>(
	({ label, errorMessage, ...props }, ref) => {
		return (
			<View className="w-full gap-1.5">
				{label && <Text className="text-base font-medium text-foreground-muted">{label}</Text>}
				<RawInput {...props} isInvalid={!!errorMessage} ref={ref} />
				{errorMessage && <Text className="text-sm text-fill-danger">{errorMessage}</Text>}
			</View>
		)
	},
)
Input.displayName = 'Input'

export { Input }
