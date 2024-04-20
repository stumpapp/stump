import { styled } from 'nativewind'
import { forwardRef } from 'react'
import { TextInput, TextInputProps } from 'react-native'

import { cn } from '../utils'

const StyledInput = styled<TextInputProps>(TextInput)

export const Input = forwardRef<TextInput, TextInputProps>(({ className, ...props }, ref) => {
	return (
		<StyledInput
			ref={ref}
			className={cn(
				'w-full rounded-md bg-gray-50 p-3 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-200',
				className,
			)}
			{...props}
		/>
	)
})
Input.displayName = 'Input'
