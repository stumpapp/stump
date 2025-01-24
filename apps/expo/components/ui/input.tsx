import * as React from 'react'
import { TextInput, type TextInputProps } from 'react-native'

import { cn } from '~/lib/utils'

const Input = React.forwardRef<React.ElementRef<typeof TextInput>, TextInputProps>(
	({ className, placeholderClassName, ...props }, ref) => {
		return (
			<TextInput
				ref={ref}
				className={cn(
					'native:h-12 native:text-lg native:leading-[1.25] h-10 rounded-md border border-edge bg-background px-3 text-base text-foreground file:border-0 file:bg-transparent file:font-medium lg:text-sm',
					props.editable === false && 'opacity-50',
					className,
				)}
				placeholderClassName={cn('text-foreground-muted', placeholderClassName)}
				{...props}
			/>
		)
	},
)

Input.displayName = 'Input'

export { Input }
