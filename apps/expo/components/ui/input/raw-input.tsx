import * as React from 'react'
import { TextInput, type TextInputProps } from 'react-native'

import { cn } from '~/lib/utils'

type RawInputProps = {
	isInvalid?: boolean
} & TextInputProps

const RawInput = React.forwardRef<React.ElementRef<typeof TextInput>, RawInputProps>(
	({ className, placeholderClassName, isInvalid, ...props }, ref) => {
		return (
			<TextInput
				ref={ref}
				className={cn(
					'native:h-12 native:text-lg native:leading-[1.25] squircle h-10 rounded-lg border border-edge bg-background px-3 text-base text-foreground file:border-0 file:bg-transparent file:font-medium lg:text-sm',
					props.editable === false && 'opacity-50',
					{ 'border-edge-danger': isInvalid },
					className,
				)}
				placeholderClassName={cn(
					'text-foreground-muted',
					{ 'text-fill-danger': isInvalid },
					placeholderClassName,
				)}
				{...props}
			/>
		)
	},
)
RawInput.displayName = 'RawInput'

export { RawInput }
