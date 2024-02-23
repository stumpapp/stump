import { forwardRef } from 'react'
import { TextInput, TextInputProps } from 'react-native'

import { cn } from '../utils'

export const Input = forwardRef<TextInput, TextInputProps>(({ className, ...props }, ref) => {
	return (
		<TextInput
			ref={ref}
			className={cn('w-full rounded-md bg-gray-200 p-3', className)}
			{...props}
		/>
	)
})
Input.displayName = 'Input'
