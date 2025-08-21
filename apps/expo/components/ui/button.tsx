import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { Pressable } from 'react-native'

import { TextClassContext } from '~/components/ui/text'
import { cn } from '~/lib/utils'

const buttonVariants = cva('group flex items-center justify-center rounded-lg', {
	variants: {
		variant: {
			brand: 'bg-fill-brand active:opacity-90',
			default: 'bg-background-surface active:opacity-90',
			destructive: 'bg-fill-danger web:hover:opacity-90 active:opacity-90',
			outline: 'border border-edge bg-background active:bg-background-surface',
			secondary: 'bg-background-inverse',
			ghost: 'active:bg-accent',
		},
		size: {
			default: 'h-10 px-4 py-2 native:h-12 native:px-5 native:py-3 tablet:h-14',
			sm: 'h-9 rounded-lg px-3',
			md: 'h-10 rounded-lg px-4',
			lg: 'h-11 rounded-lg px-8 native:h-14',
			icon: 'h-10 w-10',
		},
	},
	defaultVariants: {
		variant: 'default',
		size: 'default',
	},
})

const buttonTextVariants = cva('text-base font-medium text-foreground', {
	variants: {
		variant: {
			brand: 'text-foreground',
			default: 'text-foreground',
			destructive: 'text-white',
			outline: '',
			secondary: 'text-foreground-on-inverse',
			ghost: '',
		},
		size: {
			default: '',
			sm: '',
			md: '',
			lg: 'text-lg',
			icon: '',
		},
	},
	defaultVariants: {
		variant: 'default',
		size: 'default',
	},
})

type ButtonProps = React.ComponentPropsWithoutRef<typeof Pressable> &
	VariantProps<typeof buttonVariants>

const Button = React.forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
	({ className, variant, size, ...props }, ref) => {
		return (
			<TextClassContext.Provider
				value={cn(
					props.disabled && 'web:pointer-events-none',
					buttonTextVariants({ variant, size }),
				)}
			>
				<Pressable
					className={cn(
						props.disabled && 'web:pointer-events-none opacity-50',
						buttonVariants({ variant, size, className }),
					)}
					ref={ref}
					role="button"
					{...props}
					// style={[props.style || {}, { height: '40px' }]}
				/>
			</TextClassContext.Provider>
		)
	},
)
Button.displayName = 'Button'

export { Button, buttonTextVariants, buttonVariants }
export type { ButtonProps }
